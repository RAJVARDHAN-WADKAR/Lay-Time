"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/types";
import { Users, UserPlus, Shield, CheckCircle, XCircle } from "lucide-react";

interface AdminUserSummaryProps {
  users: User[];
}

export function AdminUserSummary({ users }: AdminUserSummaryProps) {
  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span>Account Management Summary</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Registered corporate accounts and role assignments
          </CardDescription>
        </div>
        <Link href="/users">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 px-3 rounded-xl flex items-center space-x-1">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add User</span>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-lg font-black text-slate-900">{users.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Accounts</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-lg font-black text-emerald-700">
              {users.filter((u) => u.status === "Active").length}
            </div>
            <div className="text-[10px] text-emerald-600 uppercase font-bold">Active</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-lg font-black text-blue-700">
              {users.filter((u) => u.role === "Claim Processor" || u.role === "CLAIM_PROCESSOR").length}
            </div>
            <div className="text-[10px] text-blue-600 uppercase font-bold">Processors</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
            <div className="text-lg font-black text-purple-700">
              {users.filter((u) => u.role === "Supervisor" || u.role === "SUPERVISOR").length}
            </div>
            <div className="text-[10px] text-purple-600 uppercase font-bold">Supervisors</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
