import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4 overflow-hidden">
      <div className="container mx-auto py-8 h-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Troubleshooting Guide</h1>
          <p className="text-muted-foreground">
            Get instant help with your technical issues
          </p>
        </div>
        <div className="h-[calc(100vh-200px)] max-h-[700px]">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
