"use client";

import React, { useState, useEffect } from "react";
import { Claim, EmailFollowup } from "@/lib/types";
import { getClaimChasers, sendClaimChaser } from "@/lib/api/claims";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Clock, Send, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface ClaimChasersTabProps {
  claim: Claim;
  canEdit: boolean;
}

export function ClaimChasersTab({ claim, canEdit }: ClaimChasersTabProps) {
  const [chasers, setChasers] = useState<EmailFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailFollowup["templateType"]>("30_days_reminder");
  const [recipientEmail, setRecipientEmail] = useState(`claims@${claim.accountName.toLowerCase().replace(/[^a-z]/g, "")}.com`);
  const [emailSubject, setEmailSubject] = useState(`[DEMURRAGE REMITTANCE] Claim ${claim.id} - ${claim.shipName}`);
  const [emailBody, setEmailBody] = useState("");

  const daysAwaiting = claim.daysAwaitingPayment || claim.daysOpen || 18;

  const loadChasers = async () => {
    setLoading(true);
    try {
      const data = await getClaimChasers(claim.id);
      setChasers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChasers();
  }, [claim.id]);

  useEffect(() => {
    // Auto-populate email template
    if (selectedTemplate === "30_days_reminder") {
      setEmailSubject(`[FIRST REMINDER] Outstanding Demurrage Claim ${claim.id} - ${claim.shipName}`);
      setEmailBody(
        `Dear Counterparty Claims Team,\n\nWe refer to Demurrage Claim ${claim.id} for vessel ${claim.shipName} (Voyage ${claim.voyageNumber || "VOY-2024-01"}) in the amount of ${formatCurrency(claim.claimFiledAmount)}.\n\nThis claim has reached 30 days awaiting remittance. Kindly provide the settlement confirmation or payment schedule at your earliest convenience.\n\nBest regards,\nDemurrage Operations`
      );
    } else if (selectedTemplate === "60_days_reminder") {
      setEmailSubject(`[SECOND REMINDER] Urgent Payment Request - Claim ${claim.id} - ${claim.shipName}`);
      setEmailBody(
        `Dear Counterparty Management,\n\nWe note that Demurrage Claim ${claim.id} in the amount of ${formatCurrency(claim.claimFiledAmount)} remains unpaid past 60 days following voyage completion on ${claim.voyageEndDate || "voyage end"}.\n\nPlease remit the agreed balance promptly to avoid escalation.\n\nBest regards,\nSenior Post-Fixture Analyst`
      );
    } else if (selectedTemplate === "90_days_reminder") {
      setEmailSubject(`[OVERDUE WARNING - 90 DAYS] Demurrage Claim ${claim.id} - ${claim.shipName}`);
      setEmailBody(
        `Dear Counterparty Executive Team,\n\nThis is a formal reminder that Demurrage Claim ${claim.id} (${claim.shipName}) has now been outstanding for 90 days.\n\nFailure to remit payment or provide formal grounds of dispute within 5 business days will result in management escalation and contractual interest accrual.\n\nBest regards,\nHead of Claims & Operations`
      );
    } else if (selectedTemplate === "120_days_escalation") {
      setEmailSubject(`[LEGAL ESCALATION - 120 DAYS] Formal Notice of Demand - Claim ${claim.id}`);
      setEmailBody(
        `STRICTLY URGENT & CONFIDENTIAL\n\nRE: FORMAL DEMAND - OUTSTANDING DEMURRAGE CLAIM ${claim.id} (${claim.shipName})\nAMOUNT: ${formatCurrency(claim.claimFiledAmount)}\nDAYS OVERDUE: ${daysAwaiting} DAYS\n\nTake notice that as the outstanding demurrage has exceeded 120 days without commercial resolution, this file has been referred to Legal Counsel for arbitration proceedings pursuant to Charterparty Clause 24.\n\nDemand is hereby made for immediate payment in full within 48 hours.\n\nYours faithfully,\nLegal & Commercial Directorate`
      );
    }
  }, [selectedTemplate, claim]);

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      await sendClaimChaser(claim.id, {
        recipientEmail,
        subject: emailSubject,
        templateType: selectedTemplate,
        body: emailBody,
        daysAwaitingPayment: daysAwaiting,
        status: "Sent"
      });
      await loadChasers();
      alert("Follow-up chaser dispatched and logged in database!");
    } catch (e) {
      alert("Failed to send chaser");
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Automated Claim Follow-Up Schedule (Claim Chasers)</h3>
            <p className="text-xs text-slate-500">
              Contractual aging tracking: 30 Days (Reminder) $\rightarrow$ 60 Days $\rightarrow$ 90 Days $\rightarrow$ 120 Days (Escalation)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Aging:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            daysAwaiting >= 120 ? "bg-rose-100 text-rose-800 border border-rose-300" :
            daysAwaiting >= 90 ? "bg-amber-100 text-amber-800 border border-amber-300" :
            daysAwaiting >= 30 ? "bg-blue-100 text-blue-800 border border-blue-200" :
            "bg-emerald-100 text-emerald-800"
          }`}>
            {daysAwaiting} Days Awaiting Payment
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Generator Card */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Generate Follow-up Dispatch</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Chaser Stage</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
              >
                <option value="30_days_reminder">30-Day Friendly Reminder</option>
                <option value="60_days_reminder">60-Day Urgent Follow-Up</option>
                <option value="90_days_reminder">90-Day Overdue Warning</option>
                <option value="120_days_escalation">120-Day Legal Escalation Notice</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Counterparty Recipient</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="text-xs space-y-1">
            <label className="block font-semibold text-slate-700">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
            />
          </div>

          <div className="text-xs space-y-1">
            <label className="block font-semibold text-slate-700">Message Body</label>
            <textarea
              rows={8}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] leading-relaxed"
            />
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleDispatch}
                disabled={isDispatching}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 h-9 flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Send className="h-4 w-4" />
                <span>{isDispatching ? "Dispatching..." : "Dispatch Follow-Up & Log"}</span>
              </Button>
            </div>
          )}
        </Card>

        {/* History Log Card */}
        <Card className="p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Follow-Up Audit Log</h4>

          <div className="space-y-3">
            {chasers.length > 0 ? (
              chasers.map((ch) => (
                <div key={ch.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="truncate">{ch.subject}</span>
                    <span className="text-[10px] text-blue-600 shrink-0 ml-1 font-bold">{ch.status}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Dispatched on {new Date(ch.scheduledDate).toLocaleDateString()} by {ch.sentBy || "Analyst"}
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-2 mt-1 italic">
                    "{ch.body.substring(0, 100)}..."
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No previous follow-up chasers recorded for this claim.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
