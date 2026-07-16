import { useState } from "react"
import { Card, CardContent } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { MessageSquare, Send, Bot, User } from "lucide-react"

type Message = { role: "user" | "assistant"; content: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI accounting assistant. I can help you with journal entries, financial analysis, and more. What would you like to know?" }
  ])
  const [input, setInput] = useState("")

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data: { response?: string } | null) => {
      setMessages(prev => [...prev, { role: "assistant", content: data?.response || "I couldn't process that request." }])
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }])
    }
  })

  function handleSend() {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: "user", content: input }])
    sendMessage.mutate({ message: input, conversationId: "desktop-chat" })
    setInput("")
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[70%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">Thinking...</div>
            </div>
          )}
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your finances..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              disabled={sendMessage.isPending}
            />
            <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}