import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-accent/20">
      {/* Header */}
      <div className="bg-[#F7F7F2] border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">❓</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Troubleshooting Guide</h1>
              <p className="text-gray-600 text-sm">Get instant help with your technical issues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="h-[calc(100vh-200px)] max-h-[800px]">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
