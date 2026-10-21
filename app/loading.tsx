import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
      <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        Loading...
      </p>
    </div>
  );
}
