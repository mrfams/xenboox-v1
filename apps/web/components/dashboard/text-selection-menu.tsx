"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Bot,
  MessageSquare,
  Wand2,
  Search,
  Copy,
  ExternalLink,
} from "lucide-react";

interface TextSelectionMenuProps {
  onAskAI?: (text: string) => void;
  onExplain?: (text: string) => void;
  onCorrect?: (text: string) => void;
  onSearch?: (text: string) => void;
}

export function TextSelectionMenu({
  onAskAI,
  onExplain,
  onCorrect,
  onSearch,
}: TextSelectionMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(selection.toString().trim());
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleSelection, handleClickOutside]);

  if (!isVisible || !selectedText) return null;

  const actions = [
    {
      icon: Bot,
      label: "Ask AI",
      description: "Ask about this",
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => onAskAI?.(selectedText),
    },
    {
      icon: Wand2,
      label: "Explain",
      description: "Explain this",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      onClick: () => onExplain?.(selectedText),
    },
    {
      icon: MessageSquare,
      label: "Correct",
      description: "Fix this",
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      onClick: () => onCorrect?.(selectedText),
    },
    {
      icon: Search,
      label: "Search",
      description: "Find similar",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      onClick: () => onSearch?.(selectedText),
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%) translateY(-100%)",
      }}
    >
      <div className="bg-card rounded-xl shadow-xl border border-border/50 p-1.5 flex items-center gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150",
              "hover:bg-accent/50 group",
            )}
            title={action.description}
          >
            <div className={cn("p-1.5 rounded-md", action.bgColor)}>
              <action.icon className={cn("h-3.5 w-3.5", action.color)} />
            </div>
            <span className="text-xs font-medium text-foreground group-hover:text-primary">
              {action.label}
            </span>
          </button>
        ))}

        <div className="w-px h-6 bg-border/50 mx-1" />

        <button
          onClick={() => {
            navigator.clipboard.writeText(selectedText);
            setIsVisible(false);
          }}
          className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
          title="Copy text"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-card border-r border-b border-border/50 rotate-45" />
    </div>
  );
}
