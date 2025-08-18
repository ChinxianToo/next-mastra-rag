"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotIcon, UserIcon, SendIcon, Loader2Icon } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  conversationFlow?: {
    responseType: 'text' | 'guide_confirmation' | 'step_response';
    flowState?: {
      state: string;
      sessionId?: string;
      currentStep?: number;
      awaitingResponseType?: string;
    };
    session?: unknown;
  };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userId] = useState<string>(() => 
    // Generate a simple user ID for session tracking
    'user_' + Math.random().toString(36).substring(2, 15)
  );
  const [showResponseButtons, setShowResponseButtons] = useState(false);
  const [responseType, setResponseType] = useState<'guide_confirmation' | 'step_response' | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowResponseButtons(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content,
            },
          ],
          agentId: "HelpdeskAgent",
          threadId: threadId, // Pass the thread ID for working memory
          userId: userId, // Pass user ID for conversation flow
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      console.log("API response data:", data);
      
      // Update thread ID if it's returned from the response
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content,
        role: "assistant",
        timestamp: new Date(),
        conversationFlow: data.conversationFlow,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle conversation flow response buttons
      if (data.conversationFlow) {
        const { responseType: flowResponseType } = data.conversationFlow;
        if (flowResponseType === 'guide_confirmation' || flowResponseType === 'step_response') {
          setShowResponseButtons(true);
          setResponseType(flowResponseType);
        } else {
          setShowResponseButtons(false);
          setResponseType(null);
        }
      } else {
        setShowResponseButtons(false);
        setResponseType(null);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleResponseButton = (response: string) => {
    sendMessage(response);
  };

  const renderResponseButtons = () => {
    if (!showResponseButtons || !responseType) return null;

    if (responseType === 'guide_confirmation') {
      return (
        <div className="flex gap-2 mt-2 justify-start ml-11">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResponseButton('Yes')}
            disabled={isLoading}
          >
            Yes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResponseButton('No')}
            disabled={isLoading}
          >
            No
          </Button>
        </div>
      );
    }

    if (responseType === 'step_response') {
      return (
        <div className="flex gap-2 mt-2 justify-start ml-11 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResponseButton('It worked')}
            disabled={isLoading}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            It worked
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResponseButton('Still not working')}
            disabled={isLoading}
            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
          >
            Still not working
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResponseButton('Cannot try now')}
            disabled={isLoading}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            Cannot try now
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-full flex flex-col overflow-hidden">
      <CardHeader className="border-b flex-shrink-0 bg-background">
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="w-5 h-5" />
            AI Troubleshooting Guide
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4 overflow-hidden" ref={scrollAreaRef}>
          <div className="space-y-4 w-full min-h-full">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <BotIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Welcome to AI Troubleshooting Guide</p>
                <p className="text-sm">Ask me any technical questions and I&apos;ll help you troubleshoot!</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 w-full ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] min-w-[200px] rounded-lg px-4 py-2 break-words overflow-hidden ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words overflow-hidden text-sm">
                    {message.content}
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Response buttons */}
            {renderResponseButtons()}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4 flex-shrink-0 bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={showResponseButtons ? "Use the buttons above or type a custom response..." : "Type your technical question here..."}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
          {showResponseButtons && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Use the response buttons above for quicker replies, or type your own response.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 