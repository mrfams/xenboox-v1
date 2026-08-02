"use client";

import {
  Activity,
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export default function AgentMonitorPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          Agent Monitor
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor AI agent performance, tasks, and health in real-time.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-sm text-slate-500">
            Agent Monitor is under development. This page will show real-time
            status of all 19 AI agents, their task queues, confidence scores,
            and performance metrics.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-lg border border-slate-200 p-3">
              <Bot className="h-5 w-5 text-indigo-600 mb-2" />
              <p className="text-sm font-medium text-slate-900">Agent Status</p>
              <p className="text-xs text-slate-500">
                Real-time health monitoring
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <Clock className="h-5 w-5 text-amber-600 mb-2" />
              <p className="text-sm font-medium text-slate-900">Task Queues</p>
              <p className="text-xs text-slate-500">
                Pending and in-progress tasks
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
              <p className="text-sm font-medium text-slate-900">Performance</p>
              <p className="text-xs text-slate-500">
                Confidence and accuracy metrics
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mb-2" />
              <p className="text-sm font-medium text-slate-900">Escalations</p>
              <p className="text-xs text-slate-500">
                Items needing human review
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
