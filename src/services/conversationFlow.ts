// Conversation Flow Manager - handles the 8-step troubleshooting process
import { 
  ConversationContext, 
  ConversationState, 
  UserResponse, 
  GuideMatch, 
  StepResult,
  TroubleshootingSession
} from '@/types/conversation';
import { dbService } from './database';

export class ConversationFlowManager {
  private context: ConversationContext;
  private vectorQueryTool?: { execute: (params: { context: { queryText: string; topK: number; filter: string } }) => Promise<{ sources?: unknown[] }> };

  constructor(initialContext?: Partial<ConversationContext>, vectorQueryTool?: { execute: (params: { context: { queryText: string; topK: number; filter: string } }) => Promise<{ sources?: unknown[] }> }) {
    this.context = {
      state: 'initial',
      ...initialContext
    };
    this.vectorQueryTool = vectorQueryTool;
  }

  // Main flow controller - processes user messages and returns appropriate responses
  async processMessage(userMessage: string, userId: string): Promise<{
    response: string;
    responseType: 'text' | 'guide_confirmation' | 'step_response';
    context: ConversationContext;
    session?: TroubleshootingSession;
  }> {
    try {
      switch (this.context.state) {
        case 'initial':
          return await this.handleInitialMessage(userMessage, userId);
        
        case 'guide_confirmation':
          return await this.handleGuideConfirmation(userMessage, userId);
        
        case 'awaiting_response':
          return await this.handleStepResponse(userMessage, userId);
        
        case 'presenting_step':
          // Should not receive user input in this state
          return await this.handleStepResponse(userMessage, userId);
        
        default:
          return {
            response: "I'm not sure how to help with that. Let's start over - what's the issue you're experiencing?",
            responseType: 'text',
            context: { ...this.context, state: 'initial' }
          };
      }
    } catch (error) {
      console.error('Error in conversation flow:', error);
      return {
        response: "I encountered an error. Let's start fresh - what technical issue can I help you with?",
        responseType: 'text',
        context: { ...this.context, state: 'initial' }
      };
    }
  }

  // Handle the initial user message - scope check and guide matching
  private async handleInitialMessage(userMessage: string, userId: string): Promise<{
    response: string;
    responseType: 'text' | 'guide_confirmation' | 'step_response';
    context: ConversationContext;
    session?: TroubleshootingSession;
  }> {
    // Check if user has an active session
    const activeSession = await dbService.getActiveSessionByUserId(userId);
    if (activeSession) {
      // Resume existing session
      this.context.sessionId = activeSession.id;
      this.context.currentStep = activeSession.currentStepNumber || 0;
      
      if (activeSession.matchedGuideTitle) {
        // Continue with existing guide
        return await this.presentNextStep(activeSession);
      }
    }

    // Scope check - determine if this is a hardware troubleshooting issue
    if (!this.isInScope(userMessage)) {
      return {
        response: "Sorry, I don't have relevant information for that request because it's outside my scope of hardware troubleshooting. I can help with PCs, monitors, printers, and basic desktop network/power issues. For this request, please use the support portal (My Tickets) or contact the service desk.",
        responseType: 'text',
        context: { ...this.context, state: 'initial' }
      };
    }

    // Use REAL vector search with the vectorQueryTool
    const guides = await this.searchGuides(userMessage, this.vectorQueryTool);
    
    if (guides.length === 0) {
      console.log('No guides found for query:', userMessage);
      return {
        response: "I couldn't find specific troubleshooting guides for that issue in our knowledge base. Please contact the service desk for assistance, or try describing the problem in different words (e.g., 'PC won't start', 'monitor shows no display', 'printer not working').",
        responseType: 'text',
        context: { ...this.context, state: 'initial' }
      };
    }

    // Create new session
    const session = await dbService.createSession({
      userId,
      issueDescription: userMessage,
      matchedGuideTitle: guides[0].title
    });

    // Update context
    this.context = {
      ...this.context,
      sessionId: session.id,
      userId,
      state: 'guide_confirmation',
      matchedGuides: guides,
      selectedGuide: guides[0],
      awaitingResponseType: 'guide_confirmation'
    };

    // Present guide confirmation (removed "Not Sure" option as requested)
    let response = `I think this guide matches your problem:\n\n**${guides[0].title}**\n\nDoes this sound right for your situation?\n\nReply: **Yes** or **No**`;
    
    if (guides.length > 1) {
      response += `\n\nIf no, I can suggest these alternatives:\n`;
      guides.slice(1, 3).forEach((guide, index) => {
        response += `${index + 2}. ${guide.title}\n`;
      });
    }

    return {
      response,
      responseType: 'guide_confirmation',
      context: this.context,
      session
    };
  }

  // Handle guide confirmation response
  private async handleGuideConfirmation(userMessage: string, userId: string): Promise<{
    response: string;
    responseType: 'text' | 'guide_confirmation' | 'step_response';
    context: ConversationContext;
    session?: TroubleshootingSession;
  }> {
    const response = this.parseUserResponse(userMessage);
    
    if (response === 'yes') {
      // User confirmed the guide, start with step 1
      return await this.startTroubleshootingSteps();
    } else if (response === 'no') {
      // Show alternatives
      if (this.context.matchedGuides && this.context.matchedGuides.length > 1) {
        let altResponse = "Here are other possible matches:\n\n";
        this.context.matchedGuides.slice(1, 3).forEach((guide, index) => {
          altResponse += `${index + 1}. ${guide.title}\n`;
        });
        altResponse += "\nWhich matches best? Reply with the number (1, 2) or 'None'.";
        
        return {
          response: altResponse,
          responseType: 'guide_confirmation',
          context: this.context
        };
      } else {
        // No alternatives available
        return {
          response: "I don't have other suitable guides for your issue. Let's try a different description - can you explain your problem in different words?",
          responseType: 'text',
          context: { ...this.context, state: 'initial' }
        };
      }
    } else {
      // Check if user selected an alternative (1, 2, etc.)
      const altIndex = parseInt(userMessage.trim());
      if (!isNaN(altIndex) && this.context.matchedGuides && altIndex <= this.context.matchedGuides.length - 1) {
        // User selected an alternative guide
        this.context.selectedGuide = this.context.matchedGuides[altIndex];
        
        // Update session with new guide
        if (this.context.sessionId) {
          await dbService.updateSession(this.context.sessionId, {
            matchedGuideTitle: this.context.selectedGuide.title
          });
        }
        
        return await this.startTroubleshootingSteps();
      } else if (userMessage.toLowerCase().includes('none')) {
        return {
          response: "Let's try again with a different description of your problem. What technical issue are you experiencing?",
          responseType: 'text',
          context: { ...this.context, state: 'initial' }
        };
      } else {
        return {
          response: "Please reply with **Yes**, **No**, or select a number from the alternatives shown.",
          responseType: 'guide_confirmation',
          context: this.context
        };
      }
    }
  }

  // Start presenting troubleshooting steps
  private async startTroubleshootingSteps(): Promise<{
    response: string;
    responseType: 'step_response';
    context: ConversationContext;
    session?: TroubleshootingSession;
  }> {
    if (!this.context.selectedGuide || !this.context.sessionId) {
      throw new Error('No guide selected or session not found');
    }

    const firstStep = this.context.selectedGuide.steps[0];
    this.context.currentStep = 1;
    this.context.totalSteps = this.context.selectedGuide.steps.length;
    this.context.state = 'awaiting_response';
    this.context.awaitingResponseType = 'step_result';

    // Update session
    await dbService.updateSession(this.context.sessionId, {
      currentStepNumber: 1
    });

    const response = `**Troubleshooting steps for "${this.context.selectedGuide.title}":**\n\nStep 1: ${firstStep}\n\nReply: **It worked**, **Still not working**, or **Cannot try now**.`;

    return {
      response,
      responseType: 'step_response',
      context: this.context
    };
  }

  // Handle user response to troubleshooting step
  private async handleStepResponse(userMessage: string, userId: string): Promise<{
    response: string;
    responseType: 'text' | 'step_response';
    context: ConversationContext;
    session?: TroubleshootingSession;
  }> {
    const userResponse = this.parseUserResponse(userMessage);
    
    if (!this.context.sessionId || !this.context.selectedGuide || !this.context.currentStep) {
      throw new Error('Invalid session state');
    }

    const currentStepText = this.context.selectedGuide.steps[this.context.currentStep - 1];

    // Record the step attempt
    await dbService.createStep({
      sessionId: this.context.sessionId,
      stepNumber: this.context.currentStep,
      stepText: currentStepText,
      attempted: true,
      resolvedIssue: userResponse === 'it_worked'
    });

    switch (userResponse) {
      case 'it_worked':
        // Problem resolved!
        await dbService.updateSession(this.context.sessionId, {
          resolved: true,
          completedAt: new Date()
        });
        
        this.context.state = 'resolved';
        
        return {
          response: "Great! Glad I could help. Your session is now closed.",
          responseType: 'text',
          context: this.context
        };

      case 'still_not_working':
        // Move to next step or escalate
        return await this.proceedToNextStep();

      case 'cannot_try_now':
        // Handle session pause
        await dbService.updateSession(this.context.sessionId, {
          abandoned: true
        });
        
        this.context.state = 'abandoned';
        
        return {
          response: "I understand you can't try this now. Feel free to return later and we can continue where we left off, or contact support if you need immediate assistance.",
          responseType: 'text',
          context: this.context
        };

      default:
        return {
          response: "Please reply with **It worked**, **Still not working**, or **Cannot try now**.",
          responseType: 'step_response',
          context: this.context
        };
    }
  }

  // Proceed to next step or escalate if all steps completed
  private async proceedToNextStep(): Promise<{
    response: string;
    responseType: 'text' | 'step_response';
    context: ConversationContext;
  }> {
    if (!this.context.selectedGuide || !this.context.currentStep || !this.context.sessionId) {
      throw new Error('Invalid state for proceeding to next step');
    }

    const nextStepNumber = this.context.currentStep + 1;
    
    if (nextStepNumber > this.context.selectedGuide.steps.length) {
      // All steps completed without success - escalate
      return await this.escalateToTicket();
    }

    // Present next step
    const nextStep = this.context.selectedGuide.steps[nextStepNumber - 1];
    this.context.currentStep = nextStepNumber;

    // Update session
    await dbService.updateSession(this.context.sessionId, {
      currentStepNumber: nextStepNumber
    });

    const response = `Step ${nextStepNumber}: ${nextStep}\n\nReply: **It worked**, **Still not working**, or **Cannot try now**.`;

    return {
      response,
      responseType: 'step_response',
      context: this.context
    };
  }

  // Escalate to ticket creation
  private async escalateToTicket(): Promise<{
    response: string;
    responseType: 'text';
    context: ConversationContext;
  }> {
    if (!this.context.sessionId || !this.context.selectedGuide) {
      throw new Error('Invalid state for escalation');
    }

    // Create ticket
    await dbService.createTicket({
      sessionId: this.context.sessionId,
      matchedGuideTitle: this.context.selectedGuide.title
    });

    // Mark session as completed but unresolved
    await dbService.updateSession(this.context.sessionId, {
      completedAt: new Date()
    });

    this.context.state = 'escalation';

    return {
      response: "Looks like this didn't resolve your problem. I'll create a ticket for the service desk so they can help further.",
      responseType: 'text',
      context: this.context
    };
  }

  // Continue with existing session
  private async presentNextStep(session: TroubleshootingSession): Promise<{
    response: string;
    responseType: 'step_response';
    context: ConversationContext;
    session: TroubleshootingSession;
  }> {
    // This would load the guide and continue from where they left off
    // For now, return a simple continuation message
    return {
      response: `Continuing with your previous session for "${session.matchedGuideTitle}". Let me know if you completed the last step or if you'd like to start over.`,
      responseType: 'step_response',
      context: this.context,
      session
    };
  }

  // Utility methods
  private isInScope(message: string): boolean {
    const inScopeKeywords = [
      'monitor', 'display', 'screen', 'pc', 'computer', 'laptop', 'boot', 'power',
      'printer', 'keyboard', 'mouse', 'ethernet', 'network', 'cable', 'connection',
      'hardware', 'device', 'peripheral', 'won\'t turn on', 'not working', 'blank',
      'no signal', 'frozen', 'slow', 'overheating', 'windows', 'window', 'start',
      'startup', 'turn on', 'won\'t start', 'internet', 'wifi', 'wired', 'access'
    ];
    
    const outOfScopeKeywords = [
      'password', 'account', 'billing', 'ticket', 'software license', 'software licensing',
      'hr', 'policy', 'procurement', 'payroll', 'user account', 'login credentials'
    ];

    const lowerMessage = message.toLowerCase();
    
    // Check for out-of-scope keywords first (but be more specific)
    if (outOfScopeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return false;
    }
    
    // Check for in-scope keywords
    return inScopeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async searchGuides(query: string, vectorQueryTool?: { execute: (params: { context: { queryText: string; topK: number; filter: string } }) => Promise<{ sources?: unknown[] }> }): Promise<GuideMatch[]> {
    // Use REAL RAG with vector search if tool is available
    if (vectorQueryTool) {
      try {
        console.log('Using RAG vector search for query:', query);
        
        // Call the actual vector search tool
        const vectorResult = await vectorQueryTool.execute({
          context: {
            queryText: query,
            topK: 5,
            filter: "{}"
          }
        });

        console.log('Vector search result:', vectorResult);

        // Transform vector results into GuideMatch format
        if (vectorResult.sources && vectorResult.sources.length > 0) {
          const sources = vectorResult.sources as Array<{ document?: string; text?: string; metadata?: { title?: string; category?: string }; score?: number }>;
          const guides: GuideMatch[] = sources.map((source) => {
            // Get the text content - it should be the troubleshooting text from our CSV
            const content = source.document || source.text || '';
            
            // Get title from metadata (this is what we stored)
            const title = source.metadata?.title || 'Troubleshooting Guide';
            
            // Split content into lines and extract steps
            const lines = content.split('\n').filter(line => line.trim());
            
            // Look for step patterns in the content
            const steps = [];
            for (const line of lines) {
              const trimmed = line.trim();
              if (/^Step\s\d+:/i.test(trimmed)) {
                // Extract step content after "Step X:"
                steps.push(trimmed.replace(/^Step\s\d+:\s*/i, ''));
              } else if (trimmed.length > 10 && !trimmed.includes('–') && !title.includes(trimmed)) {
                // If it's a substantial line that's not the title, it's likely a step
                steps.push(trimmed);
              }
            }

            return {
              title: title.trim(),
              steps: steps.length > 0 ? steps : [content.trim()],
              relevanceScore: source.score,
              category: source.metadata?.category
            };
          });

          console.log('Transformed guides:', guides);
          return guides;
        } else {
          console.log('No sources found in vector result');
        }
      } catch (error) {
        console.error('Vector search failed:', error);
      }
    } else {
      console.log('No vector query tool available');
    }

    // Fallback: Return empty array instead of fake guides
    console.log('Vector search failed or no results found');
    return [];
  }

  private parseUserResponse(message: string): UserResponse {
    const lowerMessage = message.toLowerCase().trim();
    
    if (lowerMessage.includes('it worked') || lowerMessage.includes('worked') || lowerMessage.includes('fixed') || lowerMessage.includes('resolved')) {
      return 'it_worked';
    }
    if (lowerMessage.includes('still not working') || lowerMessage.includes('still not') || lowerMessage.includes('not working') || lowerMessage.includes('didn\'t work')) {
      return 'still_not_working';
    }
    if (lowerMessage.includes('cannot try') || lowerMessage.includes('can\'t try') || lowerMessage.includes('cannot') || lowerMessage.includes('later')) {
      return 'cannot_try_now';
    }
    if (lowerMessage.includes('yes') || lowerMessage === 'y') {
      return 'yes';
    }
    if (lowerMessage.includes('no') || lowerMessage === 'n') {
      return 'no';
    }
    
    return 'still_not_working'; // Default fallback
  }

  // Get current context
  getContext(): ConversationContext {
    return this.context;
  }

  // Update context
  updateContext(newContext: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...newContext };
  }
}
