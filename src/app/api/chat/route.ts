import { mastra } from "@/mastra";

export async function POST(req: Request) {
  try {
    const { messages, threadId, resourceId, agentId } = await req.json();
    console.log("agentId in api", agentId);
    console.log("messages received:", messages);
    console.log("threadId:", threadId);

    // Use the default agent from mastra registry
    const myAgent = mastra.getAgent(agentId);
    console.log("Agent retrieved:", myAgent ? "success" : "failed");

    if (!myAgent) {
      throw new Error("Agent not found");
    }

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
    
    return Response.json({ 
      content: response.text,
      threadId: response.threadId || threadId,
      resourceId: response.resourceId || resourceId
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // If the error is related to working memory and no thread, try without working memory
    if (error instanceof Error && error.message && error.message.includes("Thread ID and Memory instance are required")) {
      try {
        console.log("Attempting to retry without working memory...");
        const { messages, agentId } = await req.json();
        const myAgent = mastra.getAgent(agentId);
        
        if (myAgent) {
          // Try again without threadId to let the agent handle it
          const response = await myAgent.generate(messages);
          return Response.json({ 
            content: response.text,
            threadId: response.threadId,
            resourceId: response.resourceId
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
