"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent } from "@/components/ui/card";
import { BotIcon, UserIcon, SendIcon, Loader2Icon } from "lucide-react";
import { TroubleshootingChecklist } from "./TroubleshootingChecklist";
import { ChecklistOutcome } from "@/types/conversation";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  conversationFlow?: {
    responseType: 'text';
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

  const [checklistData, setChecklistData] = useState<{
    guideTitle: string;
    steps: string[];
    sessionId: string;
  } | null>(null);
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
      
      // Check if response contains checklist format
      const checklist = parseChecklistResponse(data.content);
      if (checklist) {
        // Get session ID from response
        const sessionId = data.conversationFlow?.session?.id || 
                         (data.conversationFlow && data.conversationFlow.session ? data.conversationFlow.session.id : null) ||
                         'temp-session';
        
        setChecklistData({
          ...checklist,
          sessionId
        });
        
        // Don't show the raw checklist text, only show a simple message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I found a troubleshooting guide for your issue. Please use the interactive checklist below to work through the steps.`,
          role: "assistant",
          timestamp: new Date(),
          conversationFlow: data.conversationFlow,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Normal message handling
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.content,
          role: "assistant",
          timestamp: new Date(),
          conversationFlow: data.conversationFlow,
        };
        setMessages(prev => [...prev, assistantMessage]);
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



  // Parse checklist format from agent response
  const parseChecklistResponse = (response: string): { guideTitle: string; steps: string[] } | null => {
    const startMarker = 'CHECKLIST_FORM_START';
    const endMarker = 'CHECKLIST_FORM_END';
    
    if (!response.includes(startMarker) || !response.includes(endMarker)) {
      return null;
    }

    const start = response.indexOf(startMarker) + startMarker.length;
    const end = response.indexOf(endMarker);
    
    if (start >= end) return null;

    const checklistContent = response.substring(start, end).trim();
    const lines = checklistContent.split('\n').map(line => line.trim()).filter(line => line);

    let title = '';
    const steps: string[] = [];

    for (const line of lines) {
      if (line.startsWith('TITLE:')) {
        title = line.substring(6).trim();
      } else if (line.startsWith('STEP:')) {
        steps.push(line.substring(5).trim());
      }
    }

    if (!title || steps.length === 0) return null;

    return { guideTitle: title, steps };
  };

  // Handle checklist outcome
  const handleChecklistOutcome = async (outcome: ChecklistOutcome) => {
    setIsLoading(true);
    setChecklistData(null);

    try {
      const response = await fetch("/api/chat/checklist-outcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome,
          userId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors from backend
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: data.content || "Failed to process checklist outcome. Please try again.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        // Keep checklist open so user can try again
        setChecklistData(checklistData);
        return;
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.content,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If it's "another issue", clear the UI for new input
      if (outcome.type === 'another_issue') {
        setChecklistData(null);
      }
    } catch (error) {
      console.error("Error processing checklist outcome:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error processing your response. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <div className="h-full flex flex-col gap-4">
      {/* Chat Messages Area - Always show */}
      <Card className="flex-1 min-h-0 bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6 h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BotIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Welcome to AI Troubleshooting Guide</p>
                <p className="text-sm">Ask me any technical questions and I&apos;ll help you troubleshoot!</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" ref={scrollAreaRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 w-full ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <BotIcon className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] min-w-[200px] rounded-lg px-4 py-3 break-words overflow-hidden ${
                      message.role === "user"
                        ? "bg-[#F7F7F2] text-black"
                        : "bg-gray-100 text-black"
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
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}



              {/* Troubleshooting Checklist - Show within conversation */}
              {checklistData && (
                <div className="mt-4">
                  <TroubleshootingChecklist
                    guideTitle={checklistData.guideTitle}
                    steps={checklistData.steps}
                    sessionId={checklistData.sessionId}
                    onOutcome={handleChecklistOutcome}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Input */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4 bg-[#F7F7F2]">
          <div className="flex gap-3">
            <Input
              placeholder={checklistData ? "Please complete the troubleshooting checklist above first" : "Describe your issue here..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || checklistData !== null}
              className="flex-1 h-12 px-4 border-gray-300 rounded-lg text-base placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <Button 
              size="lg" 
              className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading || checklistData !== null}
            >
              {isLoading ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <SendIcon className="h-4 w-4" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 