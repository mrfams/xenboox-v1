"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare, Plus, Trash2, GitBranch, Search, X, Download, BarChart3, Share2 } from "lucide-react"
import { useEntity } from "@/lib/entity-context"
import { trpc } from "@/lib/trpc/client"
import { Button, Input } from "@/components/ui"
import { ChatMessage, ChatInput, AgentActivityIndicator, ConversationTree } from "@/components/chat"
import { cn } from "@/lib/utils"

const AGENT_LABELS: Record<string, string> = {
  cfo: "CFO",
  controller: "Controller",
  treasury: "Treasury",
  payroll_manager: "Payroll",
  compliance: "Compliance",
  ledger: "Ledger",
  ap: "AP",
  ar: "AR",
  asset: "Asset",
  inventory: "Inventory",
  reporting: "Reporting",
}

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string | null
  confidence?: number | null
  agentModel?: string | null
  latencyMs?: number | null
  metadata?: Record<string, unknown> | null
}

type Activity = {
  agentId?: string
  tier?: string
  action: string
  detail?: string
  confidence?: number
  durationMs?: number
}

type Conversation = {
  id: string
  title: string | null
  lastMessageAt: Date | null
  messageCount: number | null
  forkedFromConversationId?: string | null
  forkedFromMessageId?: string | null
}

export default function ChatPage() {
  const { entityId } = useEntity()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const utils = trpc.useUtils()

  const { data: conversationTree, isLoading: loadingConversations } =
    trpc.chat.getConversationTree.useQuery(undefined, { enabled: !!entityId && !isSearching })

  const { data: searchResults, isLoading: isSearchLoading } =
    trpc.chat.searchConversations.useQuery(
      { query: searchQuery },
      { enabled: !!entityId && isSearching && searchQuery.length >= 2 },
    )

  const { data: existingMessages, isLoading: loadingMessages } =
    trpc.chat.getMessages.useQuery(
      { conversationId: activeConversationId! },
      { enabled: !!activeConversationId },
    )

  const { data: analytics } = trpc.chat.getConversationAnalytics.useQuery(
    { conversationId: activeConversationId! },
    { enabled: !!activeConversationId && showAnalytics },
  )

  useEffect(() => {
    if (existingMessages) {
      setMessages(existingMessages as Message[])
    }
  }, [existingMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activity])

  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (conversation) => {
      setActiveConversationId(conversation.id)
      setMessages([])
      utils.chat.listConversations.invalidate()
    },
  })

  const forkConversation = trpc.chat.forkConversation.useMutation({
    onSuccess: (conversation) => {
      setActiveConversationId(conversation.id)
      setMessages([])
      utils.chat.listConversations.invalidate()
    },
  })

  const updateMessage = trpc.chat.updateMessage.useMutation({
    onSuccess: (updated) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id ? { ...m, content: updated.content ?? m.content } : m
        )
      )
    },
  })

  const deleteMessage = trpc.chat.deleteMessage.useMutation({
    onSuccess: (_, variables) => {
      setMessages((prev) => prev.filter((m) => m.id !== variables.messageId))
      utils.chat.listConversations.invalidate()
    },
  })

  const toggleReaction = trpc.chat.toggleReaction.useMutation({
    onSuccess: () => {
      if (activeConversationId) {
        utils.chat.getMessages.invalidate({ conversationId: activeConversationId })
      }
    },
  })

  const shareConversation = trpc.chat.shareConversation.useMutation()

  const exportConversation = trpc.chat.exportConversation.useMutation()

  const getUploadUrl = trpc.document.getUploadUrl.useMutation()
  const confirmUpload = trpc.document.confirmUpload.useMutation()
  const addAttachment = trpc.chat.addAttachment.useMutation()

  const handleNewConversation = () => {
    createConversation.mutate({})
  }

  const handleFork = useCallback(async (messageId: string) => {
    if (!activeConversationId) return
    
    const title = prompt("Name this branch (optional):")
    
    forkConversation.mutate({
      sourceConversationId: activeConversationId,
      forkAtMessageId: messageId,
      title: title ?? undefined,
    })
  }, [activeConversationId, forkConversation])

  const handleEdit = useCallback(async (messageId: string, content: string) => {
    if (!activeConversationId) return
    
    updateMessage.mutate({
      conversationId: activeConversationId,
      messageId,
      content,
    })
  }, [activeConversationId, updateMessage])

  const handleDelete = useCallback(async (messageId: string) => {
    if (!activeConversationId) return
    
    deleteMessage.mutate({
      conversationId: activeConversationId,
      messageId,
    })
  }, [activeConversationId, deleteMessage])

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!activeConversationId) return
    
    toggleReaction.mutate({
      conversationId: activeConversationId,
      messageId,
      emoji,
    })
  }, [activeConversationId, toggleReaction])

  const handleShare = useCallback(async () => {
    if (!activeConversationId) return
    
    const email = prompt("Enter email address to share with:")
    if (!email) return
    
    shareConversation.mutate({
      conversationId: activeConversationId,
      email,
      permission: "read",
    })
  }, [activeConversationId, shareConversation])

  const handleExport = useCallback(async (format: "json" | "markdown") => {
    if (!activeConversationId) return
    
    const result = await exportConversation.mutateAsync({
      conversationId: activeConversationId,
      format,
    })

    // Create and download the file
    let content: string
    let extension: string

    if (format === "json") {
      content = JSON.stringify(result, null, 2)
      extension = "json"
    } else {
      content = (result as { markdown: string }).markdown ?? ""
      extension = "md"
    }

    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversation-${activeConversationId.slice(0, 8)}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeConversationId, exportConversation])

  const handleSend = useCallback(async (message: string, files?: File[]) => {
    if (!activeConversationId || !entityId) return

    // Add user message optimistically
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setActivity({ action: "sending", detail: "Preparing your request..." })

    // Upload attachments if present
    let attachmentIds: string[] = []
    if (files && files.length > 0) {
      setActivity({ action: "uploading", detail: `Uploading ${files.length} file(s)...` })

      for (const file of files) {
        try {
          // Get presigned upload URL from document router
          const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
            fileName: file.name,
            mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/tiff" | "image/webp" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-excel" | "text/csv" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/msword",
            fileSize: file.size,
          })

          // Upload file directly to R2
          await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          })

          // Create document record
          const { documentId } = await confirmUpload.mutateAsync({
            r2Key: storagePath,
            r2Bucket: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "xenboox-uploads",
            name: file.name,
            type: file.type.startsWith("image/") ? "receipt" : "supporting",
            mimeType: file.type,
            fileSize: file.size,
          })

          // Create chat attachment record
          const attachment = await addAttachment.mutateAsync({
            conversationId: activeConversationId,
            documentId,
            attachmentType: file.type.startsWith("image/") ? "image" : "document",
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            r2Key: storagePath,
            r2Bucket: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "xenboox-uploads",
          })

          attachmentIds.push(attachment.id)
        } catch (err) {
          console.error("Failed to upload attachment:", err)
        }
      }
    }

    // Abort previous stream
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-entity-id": entityId,
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message,
          attachmentIds,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        throw new Error(`Stream failed: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))

            switch (currentEvent) {
              case "agent_activity":
                setActivity({
                  agentId: data.agentId,
                  tier: data.tier,
                  action: data.action,
                  detail: data.detail,
                  confidence: data.confidence,
                  durationMs: data.durationMs,
                })
                break

              case "token_delta":
                setMessages((prev) => {
                  const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"))
                  const existing = withoutTemp.find((m) => m.id === "streaming")
                  if (existing) {
                    // Update existing streaming message
                    return withoutTemp.map((m) =>
                      m.id === "streaming" ? { ...m, content: data.content } : m
                    )
                  }
                  // Create new streaming message
                  return [
                    ...withoutTemp,
                    {
                      id: "streaming",
                      role: "assistant" as const,
                      content: data.content,
                    },
                  ]
                })
                break

              case "message_delta":
                setMessages((prev) => {
                  const withoutTemp = prev
                    .filter((m) => !m.id.startsWith("temp-"))
                    .filter((m) => m.id !== "streaming")
                  const assistantMsg: Message = {
                    id: data.messageId,
                    role: "assistant",
                    content: data.content,
                    confidence: data.confidence,
                    latencyMs: data.latencyMs,
                    metadata: {
                      agentId: data.agentId,
                      tier: data.tier,
                      errors: data.errors,
                    },
                  }
                  return [...withoutTemp, assistantMsg]
                })
                setActivity(null)
                break

              case "message_stop":
                setIsStreaming(false)
                setActivity(null)
                utils.chat.listConversations.invalidate()
                utils.chat.getMessages.invalidate({ conversationId: activeConversationId })
                break

              case "error":
                setIsStreaming(false)
                setActivity(null)
                setMessages((prev) => [
                  ...prev.filter((m) => !m.id.startsWith("temp-")),
                  {
                    id: `error-${Date.now()}`,
                    role: "system",
                    content: `Error: ${data.error}`,
                  },
                ])
                break
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setIsStreaming(false)
        setActivity(null)
        setMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("temp-")),
          {
            id: `error-${Date.now()}`,
            role: "system",
            content: `Connection error: ${(err as Error).message}`,
          },
        ])
      }
    }
  }, [activeConversationId, entityId, utils])

  // Select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversationTree && conversationTree.length > 0) {
      // Find the first leaf or root conversation
      const findFirst = (nodes: typeof conversationTree): string | null => {
        for (const node of nodes) {
          if (node.children.length === 0) {
            return node.conversation.id
          }
          const childId = findFirst(node.children)
          if (childId) return childId
        }
        return nodes[0]?.conversation.id ?? null
      }
      const firstId = findFirst(conversationTree)
      if (firstId) {
        setActiveConversationId(firstId)
      }
    }
  }, [activeConversationId, conversationTree])

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      {/* Conversation list sidebar */}
      <div className="hidden w-72 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNewConversation}
            disabled={createConversation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearching(e.target.value.length >= 2)
              }}
              className="h-8 pl-8 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setIsSearching(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            isSearchLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Searching...</div>
            ) : searchResults && searchResults.length > 0 ? (
              <ul className="space-y-0.5 p-2">
                {searchResults.map((result) => (
                  <li key={result.conversation.id}>
                    <button
                      onClick={() => {
                        setActiveConversationId(result.conversation.id)
                        setMessages([])
                        setIsSearching(false)
                        setSearchQuery("")
                      }}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        activeConversationId === result.conversation.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {result.matchType === "title" ? (
                          <MessageSquare className="h-4 w-4 shrink-0" />
                        ) : (
                          <GitBranch className="h-4 w-4 shrink-0" />
                        )}
                        <span className="flex-1 truncate">
                          {result.conversation.title ?? "Untitled"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {result.matchType === "title" ? "title" : "content"}
                        </span>
                      </div>
                      {result.snippet && (
                        <span className="truncate pl-6 text-xs text-muted-foreground">
                          {result.snippet}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )
          ) : loadingConversations ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : conversationTree && conversationTree.length > 0 ? (
            <ConversationTree
              tree={conversationTree}
              activeConversationId={activeConversationId}
              onSelect={(id) => {
                setActiveConversationId(id)
                setMessages([])
              }}
            />
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {activeConversationId ? (
          <>
            {/* Header with export */}
            <div className="flex items-center justify-between border-b px-4 py-2 lg:px-8">
              <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    showAnalytics ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => handleExport("markdown")}
                  disabled={exportConversation.isPending}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Export MD
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => handleExport("json")}
                  disabled={exportConversation.isPending}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleShare}
                  disabled={shareConversation.isPending}
                >
                  <Share2 className="mr-1 h-3 w-3" />
                  Share
                </Button>
              </div>
            </div>

            {/* Analytics Panel */}
            {showAnalytics && analytics && (
              <div className="border-b bg-muted/50 px-4 py-3 lg:px-8">
                <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                    <div className="text-lg font-semibold">{analytics.totalMessages}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {analytics.userMessages} user / {analytics.assistantMessages} assistant
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Confidence</div>
                    <div className="text-lg font-semibold">
                      {analytics.avgConfidence != null
                        ? `${(analytics.avgConfidence * 100).toFixed(0)}%`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Latency</div>
                    <div className="text-lg font-semibold">
                      {analytics.avgLatency != null
                        ? `${(analytics.avgLatency / 1000).toFixed(1)}s`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Attachments</div>
                    <div className="text-lg font-semibold">{analytics.attachmentCount}</div>
                  </div>
                </div>
                {Object.keys(analytics.agentUsage).length > 0 && (
                  <div className="mx-auto mt-2 max-w-3xl">
                    <div className="text-xs text-muted-foreground">Agent Usage</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(analytics.agentUsage).map(([agent, count]) => (
                        <span
                          key={agent}
                          className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs"
                        >
                          {AGENT_LABELS[agent] ?? agent}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">AI Financial Assistant</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Ask questions about your finances, request reports, or get help
                      with accounting tasks.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content ?? ""}
                      confidence={msg.confidence}
                      agentId={(msg.metadata as Record<string, unknown>)?.agentId as string}
                      tier={(msg.metadata as Record<string, unknown>)?.tier as string}
                      latencyMs={msg.latencyMs}
                      errors={(msg.metadata as Record<string, unknown>)?.errors as string[]}
                      messageId={msg.id}
                      onFork={msg.role === "assistant" && !msg.id.startsWith("temp-") ? handleFork : undefined}
                      onEdit={msg.role === "user" && !msg.id.startsWith("temp-") ? handleEdit : undefined}
                      onDelete={!msg.id.startsWith("temp-") ? handleDelete : undefined}
                      onReact={!msg.id.startsWith("temp-") ? handleReact : undefined}
                    />
                  ))}
                  <AgentActivityIndicator activity={activity} />
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-card px-4 py-4 lg:px-8">
              <div className="mx-auto max-w-3xl">
                <ChatInput
                  onSend={handleSend}
                  disabled={isStreaming || !entityId}
                  placeholder={
                    !entityId
                      ? "Select an organization first..."
                      : isStreaming
                        ? "Agent is thinking..."
                        : "Ask your AI accountant anything..."
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Start a Conversation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask your AI financial assistant anything.
              </p>
            </div>
            <Button onClick={handleNewConversation} disabled={createConversation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
