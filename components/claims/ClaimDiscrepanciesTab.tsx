import React from "react";
import { Discrepancy } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ClaimDiscrepanciesTabProps {
  discrepancies: Discrepancy[];
  userCanEdit: boolean;
  onCorrect: (disc: Discrepancy) => void;
}

export function ClaimDiscrepanciesTab({
  discrepancies,
  userCanEdit,
  onCorrect,
}: ClaimDiscrepanciesTabProps) {
  if (discrepancies.length === 0) {
    return (
      <Card className="p-8 text-center border-emerald-200 bg-emerald-50/50">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <h4 className="font-bold text-emerald-900 text-sm">No Discrepancies Detected</h4>
        <p className="text-xs text-emerald-700 mt-1">
          All Statement of Facts activities, timestamps, and sequence validations passed smoothly.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {discrepancies.map((disc) => (
        <Card key={disc.id} className="border-rose-200 bg-rose-50/30 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-rose-100 text-rose-600 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{disc.title}</h4>
                <p className="text-slate-600 mt-0.5">{disc.description}</p>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
                  <span>
                    Current: <code className="bg-slate-100 px-1 rounded">{disc.currentValue}</code>
                  </span>
                  <span>
                    Suggested:{" "}
                    <code className="bg-blue-50 text-blue-700 px-1 rounded">
                      {disc.suggestedValue}
                    </code>
                  </span>
                </div>
              </div>
            </div>

            {userCanEdit && (
              <Button
                size="sm"
                onClick={() => onCorrect(disc)}
                className="text-xs bg-rose-600 hover:bg-rose-700 shrink-0"
              >
                Correct Value
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
