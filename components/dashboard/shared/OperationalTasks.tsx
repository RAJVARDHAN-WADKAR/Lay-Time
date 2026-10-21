"use client";

import React from "react";
import { DashboardMetrics } from "@/lib/types";
import { Clock, FileText, Bell, Layers } from "lucide-react";

interface OperationalTasksProps {
  metrics: DashboardMetrics;
}

export function OperationalTasks({ metrics }: OperationalTasksProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
        Tasks & Operational Workflows
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
        {/* Task Card 1: Claims Awaiting Your Action */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-blue-300 transition">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-700">
              Claims Awaiting Action
            </div>
            <div className="text-xl font-black text-blue-600">
              {metrics.claimsAwaitingAction} Claims
            </div>
            <div className="text-[10px] text-slate-400">Review & verification pending</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Task Card 2: Claims Awaiting Documents */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-amber-300 transition">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-700">
              Claims Awaiting Documents
            </div>
            <div className="text-xl font-black text-amber-600">
              {metrics.claimsAwaitingDocs} Documents
            </div>
            <div className="text-[10px] text-slate-400">SOF, NOR, or Timesheet missing</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Task Card 3: Unread Messages */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-purple-300 transition">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-700">
              Unread Messages
            </div>
            <div className="text-xl font-black text-purple-600">
              {metrics.unreadNotifications} Messages
            </div>
            <div className="text-[10px] text-slate-400">System alerts & updates</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        {/* Task Card 4: Pending Actions */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between group hover:border-emerald-300 transition">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-700">
              Pending Actions
            </div>
            <div className="text-xl font-black text-emerald-600">
              {metrics.pendingActions} Actions
            </div>
            <div className="text-[10px] text-slate-400">Operational tasks in queue</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
