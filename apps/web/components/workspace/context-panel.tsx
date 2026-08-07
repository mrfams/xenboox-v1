"use client";

import { useState } from "react";
import {
  X,
  Bot,
  FileText,
  Building2,
  Calendar,
  Brain,
  Link,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  FolderOpen,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ContextItem {
  id: string;
  type:
    | "file"
    | "entity"
    | "period"
    | "agent"
    | "document"
    | "memory"
    | "reference";
  name: string;
  description?: string;
  addedAt?: string;
  removable?: boolean;
}

export interface ContextPanelData {
  files: ContextItem[];
  entity?: { name: string; id: string };
  period?: string;
  activeAgents: ContextItem[];
  recentOutputs: ContextItem[];
  memory: ContextItem[];
  references: ContextItem[];
}

// ─── Section Component ───────────────────────────────────────────────────

function ContextSection({
  title,
  icon: Icon,
  items,
  onRemove,
  emptyMessage,
  defaultOpen = true,
}: {
  title: string;
  icon: LucideIcon;
  items: ContextItem[];
  onRemove?: (id: string) => void;
  emptyMessage?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium text-foreground text-left">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {items.length}
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-3 space-y-1">
          {items.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              {emptyMessage || "No items"}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg bg-accent/30 px-3 py-2 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.removable !== false && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Context Panel Component ─────────────────────────────────────────────

interface ContextPanelProps {
  data: ContextPanelData;
  onRemoveItem?: (type: string, id: string) => void;
  onAddFile?: () => void;
  onClose?: () => void;
}

export function ContextPanel({
  data,
  onRemoveItem,
  onAddFile,
  onClose,
}: ContextPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-3 gap-3">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Open context panel"
        >
          <Brain className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors relative"
          title="Active agents"
        >
          <Bot className="h-4 w-4" />
          {data.activeAgents.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
              {data.activeAgents.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Attached files"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Context</p>
            <p className="text-[10px] text-muted-foreground">What AI knows</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onAddFile && (
            <button
              type="button"
              onClick={onAddFile}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              title="Add file"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Organization & Period */}
      {(data.entity || data.period) && (
        <div className="p-3 border-b border-border/50 space-y-2">
          {data.entity && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  Organization
                </p>
                <p className="text-xs font-medium text-foreground truncate">
                  {data.entity.name}
                </p>
              </div>
            </div>
          )}
          {data.period && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  Accounting Period
                </p>
                <p className="text-xs font-medium text-foreground">
                  {data.period}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <ContextSection
          title="Attached Files"
          icon={Paperclip}
          items={data.files}
          onRemove={(id) => onRemoveItem?.("files", id)}
          emptyMessage="No files attached"
          defaultOpen={true}
        />

        <ContextSection
          title="Active Agents"
          icon={Bot}
          items={data.activeAgents}
          emptyMessage="No agents running"
          defaultOpen={true}
        />

        <ContextSection
          title="Recent Outputs"
          icon={FileText}
          items={data.recentOutputs}
          emptyMessage="No outputs yet"
          defaultOpen={false}
        />

        <ContextSection
          title="Memory"
          icon={Brain}
          items={data.memory}
          onRemove={(id) => onRemoveItem?.("memory", id)}
          emptyMessage="AI will learn as you work"
          defaultOpen={false}
        />

        <ContextSection
          title="References"
          icon={Link}
          items={data.references}
          emptyMessage="No references"
          defaultOpen={false}
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent/50 px-3 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <FolderOpen className="h-3 w-3" />
          View all context
        </button>
      </div>
    </div>
  );
}
