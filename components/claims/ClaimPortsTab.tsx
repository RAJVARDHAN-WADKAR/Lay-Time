import React from "react";
import { Claim } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor } from "lucide-react";

export function ClaimPortsTab({ claim }: { claim: Claim }) {
  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Configured Ports & Berth Allocations</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(claim.ports || []).map((port, pIdx) => (
          <Card key={port.id} className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <Anchor className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Port #{pIdx + 1}: {port.name} ({port.portType})
                </CardTitle>
              </div>
              <span className="text-xs text-slate-500">Base Load Rate: {port.loadRate} MT/day</span>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {port.berths.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{b.name}</span>
                      <span className="text-blue-600">{b.prorataShare}% Share</span>
                    </div>
                    <div className="text-slate-600 mt-1">Cargo: {b.cargoType || "Crude Oil"}</div>
                    <div className="text-slate-600">Volume: {b.quantity.toLocaleString()} MT</div>
                    <div className="text-slate-600">Load Rate: {b.loadRate.toLocaleString()} MT/d</div>
                    {b.isProrataOverridden && (
                      <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold">
                        Manual Prorata Override
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
