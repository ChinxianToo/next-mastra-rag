import { ChecklistOutcome } from '@/types/conversation';
import {
  getTroubleshootingSession,
  updateTroubleshootingSession,
  createMultipleTroubleshootingSteps,
  createTicket
} from '@/lib/database';

export async function POST(req: Request) {
  try {
    const { outcome, userId }: { outcome: ChecklistOutcome; userId: string } = await req.json();
    
    if (!outcome || !userId) {
      return Response.json(
        { error: "Missing required fields: outcome and userId" },
        { status: 400 }
      );
    }

    console.log('Processing checklist outcome:', outcome.type, 'for session:', outcome.sessionId);
    console.log('Attempted steps:', outcome.attemptedSteps);

    // Handle the checklist outcome with database persistence
    let responseContent = '';
    let ticketId = null;
    
    try {
      // Get the session from database
      const session = await getTroubleshootingSession(outcome.sessionId);
      
      if (!session) {
        console.warn('Session not found in database:', outcome.sessionId);
        // Handle gracefully with default responses
        switch (outcome.type) {
          case 'resolved':
            responseContent = "Great! I'm glad the troubleshooting steps resolved your issue. Feel free to ask if you have any other technical problems.";
            break;
          case 'not_resolved':
            responseContent = "I understand the troubleshooting steps didn't resolve your issue. For further assistance, please contact our technical support team who can provide more advanced troubleshooting or arrange for hardware replacement if needed.";
            break;
          case 'another_issue':
            responseContent = "Got it, seems like this guide isn't matching your issue. Could you please describe your problem again? I'll search for a more suitable troubleshooting guide.";
            break;
          default:
            responseContent = "I didn't understand that response. Please try again.";
        }
      } else {
        // Create step records using the detailed step information
        if (outcome.stepDetails && outcome.stepDetails.length > 0) {
          const stepRecords = outcome.stepDetails.map(step => ({
            stepNumber: step.stepNumber,
            stepText: step.stepText,
            attempted: step.attempted,
            resolvedIssue: outcome.type === 'resolved' && step.attempted,
          }));

          await createMultipleTroubleshootingSteps(outcome.sessionId, stepRecords);
        }

        switch (outcome.type) {
          case 'resolved':
            await updateTroubleshootingSession(outcome.sessionId, {
              resolved: true,
              completedAt: new Date(),
            });
            responseContent = "Great! I'm glad the troubleshooting steps resolved your issue. Your session has been marked as resolved. Feel free to ask if you have any other technical problems.";
            break;
            
          case 'not_resolved':
            await updateTroubleshootingSession(outcome.sessionId, {
              resolved: false,
              completedAt: new Date(),
            });
            
            // Create a ticket for unresolved issue
            try {
              const ticket = await createTicket({
                sessionId: outcome.sessionId,
                matchedGuideTitle: session.matchedGuideTitle,
              });
              ticketId = ticket.id;
              responseContent = `I understand the troubleshooting steps didn't resolve your issue. I've created a support ticket (ID: ${ticket.id}) for further assistance. Our technical support team will review your case and provide more advanced troubleshooting or arrange for hardware replacement if needed.`;
            } catch (ticketError) {
              console.error('Error creating ticket:', ticketError);
              responseContent = "I understand the troubleshooting steps didn't resolve your issue. For further assistance, please contact our technical support team who can provide more advanced troubleshooting or arrange for hardware replacement if needed.";
            }
            break;
            
          case 'another_issue':
            await updateTroubleshootingSession(outcome.sessionId, {
              abandoned: true,
              misclassified: true,
              completedAt: new Date(),
            });
            responseContent = "Got it, seems like this guide isn't matching your issue. I've noted this in your session. Could you please describe your problem again? I'll search for a more suitable troubleshooting guide.";
            break;
            
          default:
            responseContent = "I didn't understand that response. Please try again.";
        }
      }
    } catch (dbError) {
      console.error('Database error processing checklist outcome:', dbError);
      // Fallback to simple responses
      switch (outcome.type) {
        case 'resolved':
          responseContent = "Great! I'm glad the troubleshooting steps resolved your issue. Feel free to ask if you have any other technical problems.";
          break;
        case 'not_resolved':
          responseContent = "I understand the troubleshooting steps didn't resolve your issue. For further assistance, please contact our technical support team who can provide more advanced troubleshooting or arrange for hardware replacement if needed.";
          break;
        case 'another_issue':
          responseContent = "Got it, seems like this guide isn't matching your issue. Could you please describe your problem again? I'll search for a more suitable troubleshooting guide.";
          break;
        default:
          responseContent = "I didn't understand that response. Please try again.";
      }
    }

    return Response.json({
      content: responseContent,
      responseType: 'text',
      outcome: outcome.type,
      ticketId: ticketId
    });

  } catch (error) {
    console.error("Error handling checklist outcome:", error);
    
    return Response.json(
      { 
        content: "Sorry, I encountered an error processing your response. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
