import React from "react";
import { Claim } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/inputs";
import { CheckCircle2, XCircle, Save, Lock } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

interface ClaimOverviewTabProps {
  claim: Claim;
  isEditingGeneral: boolean;
  generalEditForm: Partial<Claim>;
  setGeneralEditForm: React.Dispatch<React.SetStateAction<Partial<Claim>>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function ClaimOverviewTab({
  claim,
  isEditingGeneral,
  generalEditForm,
  setGeneralEditForm,
  onSave,
  isSaving,
}: ClaimOverviewTabProps) {
  const {
    canSettleClaim,
    canAssignClaim,
    canEditBillableAmount,
    canEditPayments,
    canRecordPayments
  } = useAuth();
  return (
    <div className="space-y-6 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-slate-400 block font-semibold uppercase text-[10px]">Claim Filed Amount</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(claim.claimFiledAmount)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Rate: {formatCurrency(claim.demurrageRatePerDay)} / day</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-slate-400 block font-semibold uppercase text-[10px]">Agreed Settlement</span>
          <div className="text-xl font-bold text-blue-700 mt-1">
            {(claim.agreedAmount || 0) > 0 ? formatCurrency(claim.agreedAmount || 0) : "Under Review"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Status: {claim.claimStatus}</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-slate-400 block font-semibold uppercase text-[10px]">Payment Collected</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(claim.paymentReceived || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {claim.paymentConcluded ? "Concluded" : `${claim.daysAwaitingPayment || 0} days pending`}
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-slate-400 block font-semibold uppercase text-[10px]">Timebar Compliance</span>
          <div className="mt-1 flex items-center space-x-1.5">
            {claim.timebarred ? (
              <span className="text-rose-600 font-bold flex items-center">
                <XCircle className="h-4 w-4 mr-1" /> Timebarred
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Compliant
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Notice: {claim.noticeTimebarDays}d | Claim: {claim.claimTimebarDays}d
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900">Voyage & Charterparty Commercial Details</CardTitle>
          {isEditingGeneral && (
            <Button size="sm" onClick={onSave} isLoading={isSaving} className="text-xs">
              <Save className="h-3.5 w-3.5 mr-1" />
              Save Changes
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5">
          {isEditingGeneral ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Claim Status</label>
                <Select
                  value={generalEditForm.claimStatus}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      claimStatus: e.target.value as any,
                    })
                  }
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Review" disabled={!canSettleClaim}>
                    Review {!canSettleClaim ? "(Supervisor only)" : ""}
                  </option>
                  <option value="Settled" disabled={!canSettleClaim}>
                    Settled {!canSettleClaim ? "(Supervisor only)" : ""}
                  </option>
                  <option value="Disputed">Disputed</option>
                  <option value="Timebarred">Timebarred</option>
                </Select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Demurrage Rate ($/day)</span>
                  {!canEditBillableAmount && (
                    <span className="text-[10px] text-slate-400 font-normal">Supervisor/Finance only</span>
                  )}
                </label>
                <Input
                  type="number"
                  disabled={!canEditBillableAmount}
                  value={generalEditForm.demurrageRatePerDay}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      demurrageRatePerDay: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Assigned Processor</span>
                  {!canAssignClaim && (
                    <span className="text-[10px] text-slate-400 font-normal">Supervisor only</span>
                  )}
                </label>
                <Input
                  disabled={!canAssignClaim}
                  value={generalEditForm.assignedTo || claim.assignedTo || ""}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      assignedTo: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Agreed Settlement ($)</span>
                  {!canSettleClaim && <span className="text-[10px] text-slate-400 font-normal">Supervisor only</span>}
                </label>
                <Input
                  type="number"
                  disabled={!canSettleClaim}
                  value={generalEditForm.agreedAmount}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      agreedAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Payment Received ($)</span>
                  {(claim.paymentReceived || 0) > 0 && !canEditPayments && (
                    <span className="text-[10px] text-slate-400 font-normal">Edit locked</span>
                  )}
                </label>
                <Input
                  type="number"
                  disabled={(claim.paymentReceived || 0) > 0 ? !canEditPayments : !canRecordPayments}
                  value={generalEditForm.paymentReceived}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      paymentReceived: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Contentions / Disputes</label>
                <Input
                  value={generalEditForm.contentions || ""}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      contentions: e.target.value,
                    })
                  }
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">Claim Notes</label>
                <Textarea
                  value={generalEditForm.claimNotes || ""}
                  onChange={(e) =>
                    setGeneralEditForm({
                      ...generalEditForm,
                      claimNotes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Account / Client</span>
                <span className="font-semibold text-slate-900">{claim.accountName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Counterparty</span>
                <span className="font-semibold text-slate-900">
                  {claim.counterpartyName} ({claim.counterpartyType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Broker</span>
                <span className="font-semibold text-slate-900">{claim.brokerName || "Direct"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">C/P Form & Date</span>
                <span className="font-semibold text-slate-900">
                  {claim.cpType} — {formatDate(claim.charterpartyDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Layday / Cancelling</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(claim.layday)} to {formatDate(claim.cancellingDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Voyage End Date</span>
                <span className="font-semibold text-slate-900">{formatDate(claim.voyageEndDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Notice Received</span>
                <span className="font-semibold text-slate-900">{formatDate(claim.noticeReceivedDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Assigned Processor</span>
                <span className="font-semibold text-slate-900">{claim.assignedTo}</span>
              </div>
              <div className="col-span-2 sm:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-semibold">Contentions & Notes</span>
                <p className="text-slate-700 mt-1">{claim.contentions || "No contentious deductions recorded."}</p>
                <p className="text-slate-500 mt-1 italic">{claim.claimNotes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
