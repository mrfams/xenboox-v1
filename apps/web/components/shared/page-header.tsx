"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
  };
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {badge}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <Button asChild={!!action.href}>
            {action.href ? (
              <a href={action.href}>
                {action.icon}
                {action.label}
              </a>
            ) : (
              <button onClick={action.onClick}>
                {action.icon}
                {action.label}
              </button>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
