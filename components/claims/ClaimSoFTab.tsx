import React from "react";
import { Claim, SoFActivity } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ClaimSoFTabProps {
  claim: Claim;
  userCanEdit: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (act: SoFActivity) => void;
}

export function ClaimSoFTab({
  claim,
  userCanEdit,
  onOpenAddModal,
  onOpenEditModal,
}: ClaimSoFTabProps) {
  const berths = claim.ports?.flatMap((p) => p.berths) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Statement of Facts Activity Log</h3>
          <p className="text-xs text-slate-500">Detailed chronological operational events, weather delays, and deductions</p>
        </div>
        {userCanEdit && (
          <Button size="sm" onClick={onOpenAddModal} className="text-xs flex items-center space-x-1">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Activity</span>
          </Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Berth</th>
                  <th className="p-3">Start (UTC)</th>
                  <th className="p-3">Stop (UTC)</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">% Counted</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Source Tag</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(claim.activities || []).map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{act.activityName}</td>
                    <td className="p-3 text-slate-600">
                      {berths.find((b) => b.id === act.berthId)?.name || (
                        <span className="text-rose-500 font-bold">Unassigned Berth</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{act.startTime}</td>
                    <td className="p-3 text-slate-600">{act.stopTime}</td>
                    <td className="p-3 font-bold text-slate-900">{act.durationFormatted}</td>
                    <td className="p-3">{act.percentageCounted}%</td>
                    <td className="p-3 text-slate-600">{act.deductionCategory}</td>
                    <td className="p-3">
                      {act.isCorrected ? (
                        <Badge variant="corrected">Corrected</Badge>
                      ) : act.isOcrExtracted ? (
                        <Badge variant="ocr">OCR Extracted</Badge>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Manual</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {userCanEdit ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenEditModal(act)}
                          className="h-6 px-2 text-xs text-blue-600"
                        >
                          Edit
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-xs">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
