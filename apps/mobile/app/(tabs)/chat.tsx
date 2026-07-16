import { useState, useRef, useEffect } from "react"
import { View, FlatList, KeyboardAvoidingView, Platform } from "react-native"
import { Text } from "@/components/ui/text"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { trpc } from "@/lib/trpc"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const flatListRef = useRef<FlatList>(null)
  const sendMessage = trpc.chat.sendMessage.useMutation()

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    try {
      const result = await sendMessage.mutateAsync({
        content: input.trim()
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.content,
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === "user"

    return (
      <View
        className={`mb-3 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
      >
        <Card
          variant={isUser ? "default" : "elevated"}
          className={isUser ? "bg-primary-600" : ""}
        >
          <Text
            variant="bodySmall"
            className={isUser ? "text-white" : "text-slate-900 dark:text-slate-100"}
          >
            {item.content}
          </Text>
        </Card>
        <Text
          variant="caption"
          className={`mt-1 ${isUser ? "text-right" : ""}`}
        >
          {item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Header title="AI Assistant" subtitle="CFO Agent" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Text variant="h3" className="mb-2">
                How can I help?
              </Text>
              <Text variant="bodySmall" className="text-center text-slate-500">
                Ask me about your finances, request reports, or manage your books.
              </Text>
            </View>
          }
        />

        <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <View className="flex-1">
            <Input
              placeholder="Ask your CFO..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </View>
          <Button
            onPress={handleSend}
            disabled={!input.trim()}
            loading={sendMessage.isPending}
            size="lg"
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
