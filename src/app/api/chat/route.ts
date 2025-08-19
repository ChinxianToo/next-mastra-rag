import { mastra } from "@/mastra";

export async function POST(req: Request) {
  try {
    const { messages, threadId, resourceId, agentId, userId } = await req.json();
    console.log("agentId in api", agentId);
    console.log("messages received:", messages);
    console.log("threadId:", threadId);
    console.log("userId:", userId);

    // Note: Simplified implementation without database persistence

    // Use the default agent from mastra registry
    const myAgent = mastra.getAgent(agentId);
    console.log("Agent retrieved:", myAgent ? "success" : "failed");

    if (!myAgent) {
      throw new Error("Agent not found");
    }

    // Note: conversation flow context will be handled by the agent automatically

    // Use generate instead of stream for non-streaming response
    // Pass threadId and resourceId for working memory support
    const response = await myAgent.generate(messages, { 
      resourceId: resourceId || undefined, 
      threadId: threadId || undefined 
    });
    console.log("Agent response:", response);
    
    // Log detailed information about tool calls and results
    console.log("=== DETAILED RESPONSE ANALYSIS ===");
    console.log("Response text length:", response.text?.length || 0);
    console.log("Tool calls count:", response.toolCalls?.length || 0);
    console.log("Tool results count:", response.toolResults?.length || 0);
    console.log("Finish reason:", response.finishReason);
    console.log("Usage:", response.usage);
    
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log("Tool calls details:", response.toolCalls);
    } else {
      console.log("No tool calls made - agent found results directly");
    }
    
    if (response.toolResults && response.toolResults.length > 0) {
      console.log("Tool results details:", response.toolResults);
    } else {
      console.log("No tool results - agent found results directly");
    }
    
    console.log("=== END ANALYSIS ===");
    
    // Extract conversation flow information from tool results if available
    let conversationFlowResult = null;
    if (response.toolResults && response.toolResults.length > 0) {
      const flowResult = response.toolResults.find((result: { toolName?: string; result?: unknown }) => 
        result.toolName === 'conversation_flow'
      );
      if (flowResult && flowResult.result) {
        conversationFlowResult = flowResult.result;
      }
    }

    // ALWAYS prioritize the conversation flow response when available
    let finalContent = response.text || '';
    if (conversationFlowResult && conversationFlowResult.response) {
      finalContent = conversationFlowResult.response;
    }
    
    // Ensure we always have some response
    if (!finalContent || finalContent.trim() === '') {
      finalContent = "I'm having trouble processing your request. Please try again or contact support.";
    }

    // Check if response contains checklist format and create temporary session data
    let sessionData = null;
    if (finalContent.includes('CHECKLIST_FORM_START') && finalContent.includes('CHECKLIST_FORM_END')) {
      try {
        // Parse the checklist to get the guide title
        const startMarker = 'CHECKLIST_FORM_START';
        const endMarker = 'CHECKLIST_FORM_END';
        const start = finalContent.indexOf(startMarker) + startMarker.length;
        const end = finalContent.indexOf(endMarker);
        
        if (start < end) {
          const checklistContent = finalContent.substring(start, end).trim();
          const lines = checklistContent.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
          
          let title = '';
          for (const line of lines) {
            if (line.startsWith('TITLE:')) {
              title = line.substring(6).trim();
              break;
            }
          }
          
          if (title) {
            // Get the last user message as the issue description
            const lastUserMessage = messages.filter((msg: { role: string }) => msg.role === 'user').pop();
            const issueDescription = lastUserMessage?.content || 'Hardware troubleshooting issue';
            
            // Create temporary session data for UI
            sessionData = {
              id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
              userId: userId || 'anonymous',
              issueDescription,
              matchedGuideTitle: title,
              resolved: false,
              abandoned: false,
              startedAt: new Date()
            };
            
            console.log('Created temporary session:', sessionData.id, 'for guide:', title);
          }
        }
      } catch (error) {
        console.error('Error creating temporary session for checklist:', error);
      }
    }

    return Response.json({ 
      content: finalContent,
      threadId: response.threadId || threadId,
      resourceId: response.resourceId || resourceId,
      conversationFlow: conversationFlowResult ? {
        responseType: conversationFlowResult.responseType,
        flowState: conversationFlowResult.flowState,
        session: conversationFlowResult.session || sessionData
      } : sessionData ? { session: sessionData } : null
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // If the error is related to working memory and no thread, try without working memory
    if (error instanceof Error && error.message && error.message.includes("Thread ID and Memory instance are required")) {
      try {
        console.log("Attempting to retry without working memory...");
        const { messages, agentId} = await req.json();
        const myAgent = mastra.getAgent(agentId);
        
        if (myAgent) {
          // Try again without threadId to let the agent handle it
          const response = await myAgent.generate(messages);
          
          // Extract conversation flow information from retry as well
          let conversationFlowResult = null;
          if (response.toolResults && response.toolResults.length > 0) {
            const flowResult = response.toolResults.find((result: { toolName?: string; result?: unknown }) => 
              result.toolName === 'conversation_flow'
            );
            if (flowResult && flowResult.result) {
              conversationFlowResult = flowResult.result;
            }
          }
          
          // ALWAYS prioritize the conversation flow response when available
          let finalContent = response.text || '';
          if (conversationFlowResult && conversationFlowResult.response) {
            finalContent = conversationFlowResult.response;
          }
          
          // Ensure we always have some response
          if (!finalContent || finalContent.trim() === '') {
            finalContent = "I'm having trouble processing your request. Please try again or contact support.";
          }

          return Response.json({ 
            content: finalContent,
            threadId: response.threadId,
            resourceId: response.resourceId,
            conversationFlow: conversationFlowResult ? {
              responseType: conversationFlowResult.responseType,
              flowState: conversationFlowResult.flowState,
              session: conversationFlowResult.session
            } : null
          });
        }
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }
    
    return Response.json(
      { 
        content: "Sorry, I encountered an error processing your request. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
