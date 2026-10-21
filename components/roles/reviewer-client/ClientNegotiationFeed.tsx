"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationRecord } from "@/lib/types";
import { MessageSquare, ArrowRight } from "lucide-react";

interface ClientNegotiationFeedProps {
  notifications: NotificationRecord[];
}

export function ClientNegotiationFeed({ notifications }: ClientNegotiationFeedProps) {
  return (
    <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span>Negotiation & Settlement Feed</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Counter-offer proposals and demurrage resolution updates
          </CardDescription>
        </div>
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 hover:bg-blue-50">
            <span>All Updates</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-3">
          {notifications.slice(0, 4).map((n) => (
            <div
              key={n.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3 text-xs"
            >
              <div className="p-1 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">{n.title}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>
                <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
