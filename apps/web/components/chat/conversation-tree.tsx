"use client"

import { useState } from "react"
import { MessageSquare, GitBranch, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  title: string | null
  lastMessageAt: Date | string | null
  messageCount: number | null
  forkedFromConversationId?: string | null
}

type TreeNode = {
  conversation: Conversation
  children: TreeNode[]
}

type ConversationTreeProps = {
  tree: TreeNode[]
  activeConversationId: string | null
  onSelect: (id: string) => void
}

function TreeNodeItem({
  node,
  activeConversationId,
  onSelect,
  depth = 0,
}: {
  node: TreeNode
  activeConversationId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isActive = activeConversationId === node.conversation.id
  const isFork = !!node.conversation.forkedFromConversationId

  return (
    <div>
      <button
        onClick={() => onSelect(node.conversation.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {isFork ? (
          <GitBranch className="h-4 w-4 shrink-0" />
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0" />
        )}

        <span className="flex-1 truncate">
          {node.conversation.title ?? "New conversation"}
        </span>

        {isFork && (
          <span className="text-[10px] text-muted-foreground">branch</span>
        )}
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.conversation.id}
              node={child}
              activeConversationId={activeConversationId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ConversationTree({
  tree,
  activeConversationId,
  onSelect,
}: ConversationTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    )
  }

  return (
    <ul className="space-y-0.5 p-2">
      {tree.map((node) => (
        <li key={node.conversation.id}>
          <TreeNodeItem
            node={node}
            activeConversationId={activeConversationId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}
