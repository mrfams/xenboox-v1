"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge, Button, Input } from "@/components/ui"
import { GitBranch, Pencil, Trash2, Check, X, SmilePlus } from "lucide-react"

type Attachment = {
  id: string
  fileName: string
  mimeType?: string | null
  fileSize?: number | null
  attachmentType: string
  status: string
}

type Reaction = {
  id: string
  messageId: string
  userId: string
  emoji: string
}

type ChatMessageProps = {
  role: "user" | "assistant" | "system"
  content: string
  confidence?: number | null
  agentId?: string
  tier?: string
  latencyMs?: number | null
  errors?: string[]
  attachments?: Attachment[]
  reactions?: Reaction[]
  currentUserId?: string
  messageId?: string
  onFork?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  className?: string
}

const TIER_COLORS: Record<string, string> = {
  tier1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  tier2: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  tier3: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  platform: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

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

const FILE_TYPE_ICONS: Record<string, string> = {
  document: "📄",
  image: "🖼️",
  file: "📎",
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const QUICK_REACTIONS = ["👍", "👎", "❤️", "🎯", "✅", "❌"]

export function ChatMessage({
  role,
  content,
  confidence,
  agentId,
  tier,
  latencyMs,
  errors,
  attachments,
  reactions,
  currentUserId,
  messageId,
  onFork,
  onEdit,
  onDelete,
  onReact,
  className,
}: ChatMessageProps) {
  const isUser = role === "user"
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit?.(messageId!, editContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(content)
    setIsEditing(false)
  }

  // Group reactions by emoji
  const groupedReactions = (reactions ?? []).reduce<Record<string, Reaction[]>>((acc, r) => {
    acc[r.emoji] = [...(acc[r.emoji] ?? []), r]
    return acc
  }, {})

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        {!isUser && agentId && (
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("text-[10px] font-medium", TIER_COLORS[tier ?? ""])}
            >
              {AGENT_LABELS[agentId] ?? agentId}
            </Badge>
            {confidence != null && (
              <span className="text-[10px] text-muted-foreground">
                {(confidence * 100).toFixed(0)}% confidence
              </span>
            )}
            {latencyMs != null && (
              <span className="text-[10px] text-muted-foreground">
                {(latencyMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                  isUser
                    ? "border-primary-foreground/20 bg-primary-foreground/10"
                    : "border-border bg-background",
                )}
              >
                <span>{FILE_TYPE_ICONS[att.attachmentType] ?? "📎"}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{att.fileName}</span>
                  {att.fileSize != null && (
                    <span className="text-muted-foreground">
                      {formatFileSize(att.fileSize)}
                    </span>
                  )}
                </div>
                {att.status === "processing" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Processing...
                  </Badge>
                )}
                {att.status === "failed" && (
                  <Badge variant="destructive" className="text-[10px]">
                    Failed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveEdit()
                }
                if (e.key === "Escape") {
                  handleCancelEdit()
                }
              }}
              className={cn(
                "h-auto min-h-[40px] py-2 text-sm",
                isUser ? "bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50" : "",
              )}
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancelEdit}
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleSaveEdit}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {errors && errors.length > 0 && (
          <div className="mt-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errors.map((e, i) => (
              <div key={i}>Error: {e}</div>
            ))}
          </div>
        )}

        {/* Reactions display */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(groupedReactions).map(([emoji, reactionsList]) => {
              const hasReacted = currentUserId && reactionsList.some((r) => r.userId === currentUserId)
              return (
                <button
                  key={emoji}
                  onClick={() => onReact?.(messageId!, emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    hasReacted
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span>{emoji}</span>
                  <span>{reactionsList.length}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Action buttons */}
        {messageId && (
          <div className="mt-2 flex justify-end gap-1">
            {/* Reaction button */}
            {onReact && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                >
                  <SmilePlus className="h-3 w-3" />
                </Button>
                {showReactionPicker && (
                  <div className="absolute bottom-full right-0 mb-1 flex gap-1 rounded-lg border bg-background p-1 shadow-lg">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact(messageId, emoji)
                          setShowReactionPicker(false)
                        }}
                        className="rounded p-1 text-sm hover:bg-accent"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Edit button - only on user messages */}
            {isUser && onEdit && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}

            {/* Delete button - on both user and assistant messages */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm("Delete this message?")) {
                    onDelete(messageId)
                  }
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            )}

            {/* Fork button - only on assistant messages */}
            {!isUser && onFork && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => onFork(messageId)}
              >
                <GitBranch className="mr-1 h-3 w-3" />
                Branch from here
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
