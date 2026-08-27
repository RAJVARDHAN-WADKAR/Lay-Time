import React from "react";
import { Info } from "lucide-react";

export function DemoBadge() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800 px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wide uppercase">
          Demo Mode
        </span>
        <span className="text-[11px] text-slate-300">
          Frontend-only simulation with typed mock data. Real backend seam at <code className="text-blue-400">@/lib/api/*</code>.
        </span>
      </div>
      <div className="text-[11px] text-slate-400">
        Maritime Demurrage & Laytime Calculation Engine v1.0.0
      </div>
    </footer>
  );
}
