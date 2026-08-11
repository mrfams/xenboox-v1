"use client";

import { Boxes, Zap, Clock, CheckCircle2 } from "lucide-react";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

export default function AutomationPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            Automation Studio
          </h1>
          <AiSimulationTrigger
            traceId="automation-suggestion"
            label="AI Build Workflow"
            variant="outline"
          />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Create and manage automated workflows for your accounting processes.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Boxes className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-sm text-slate-500">
            Automation Studio is under development. This page will let you
            create custom workflows, set up triggers, and automate repetitive
            accounting tasks.
          </p>
          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <Zap className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Workflow Builder
                </p>
                <p className="text-xs text-slate-500">
                  Drag-and-drop automation creation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Scheduled Tasks
                </p>
                <p className="text-xs text-slate-500">
                  Time-based automation triggers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Action Library
                </p>
                <p className="text-xs text-slate-500">
                  Pre-built actions for common tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
