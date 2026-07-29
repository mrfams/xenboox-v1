"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

type Department = {
  id: string;
  name: string;
  budgetUsed: number;
  status: "healthy" | "warning" | "critical";
};

type OperationsDepartmentPerformanceProps = {
  departments?: Department[];
  className?: string;
};

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "dept1", name: "Sales", budgetUsed: 82, status: "healthy" },
  { id: "dept2", name: "Marketing", budgetUsed: 118, status: "critical" },
  { id: "dept3", name: "Engineering", budgetUsed: 91, status: "healthy" },
  { id: "dept4", name: "Operations", budgetUsed: 76, status: "healthy" },
  { id: "dept5", name: "HR", budgetUsed: 84, status: "healthy" },
];

export function OperationsDepartmentPerformance({
  departments = DEFAULT_DEPARTMENTS,
  className,
}: OperationsDepartmentPerformanceProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Department Performance
        </h3>
      </div>

      <div className="space-y-2">
        {departments.map((dept) => {
          const isHovered = hoveredId === dept.id;
          return (
            <div
              key={dept.id}
              className="space-y-1"
              onMouseEnter={() => setHoveredId(dept.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "font-medium transition-all",
                    isHovered ? "text-foreground" : "text-foreground/80",
                  )}
                >
                  {dept.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      dept.status === "healthy"
                        ? "text-balanced-green"
                        : dept.status === "warning"
                          ? "text-attention-amber"
                          : "text-error-clay",
                    )}
                  >
                    {dept.budgetUsed}%
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      dept.budgetUsed > 100
                        ? "text-error-clay"
                        : "text-balanced-green",
                    )}
                  >
                    {dept.budgetUsed > 100
                      ? `${(dept.budgetUsed - 100).toFixed(0)}% Over`
                      : `${(100 - dept.budgetUsed).toFixed(0)}% Remaining`}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    dept.status === "healthy"
                      ? "bg-balanced-green"
                      : dept.status === "warning"
                        ? "bg-attention-amber"
                        : "bg-error-clay",
                  )}
                  style={{ width: `${Math.min(dept.budgetUsed, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
