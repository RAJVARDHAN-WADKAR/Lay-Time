const fs = require('fs');
const path = require('path');

const code = `"use client";

import React, { useState, useEffect } from "react";
import { getClaims, getClaimById } from "@/lib/api";
import { Claim } from "@/lib/types";
import { calculateClaimLaytime } from "@/lib/calculations";
import { exportClaimPdf } from "@/lib/utils/exportPdf";
import { formatCurrency, formatDate, formatMinutesToDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart,
  Download,
  FileText,
  Anchor,
  Layers,
  Printer,
  CheckCircle2,
  Ship,
  Eye,
} from "lucide-react";

export default function ReportsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("CLM-2024-001");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [reportType, setReportType] = useState<"claim" | "port" | "berth">("claim");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      setIsLoading(true);
      const allClaims = await getClaims();
      setClaims(allClaims);
      const active = allClaims.find((c) => c.id === selectedClaimId) || allClaims[0];
      setClaim(active);
      if (active) setSelectedClaimId(active.id);
      setIsLoading(false);
    }
    loadInitial();
  }, []);

  const handleClaimChange = async (id: string) => {
    setSelectedClaimId(id);
    setIsLoading(true);
    const c = await getClaimById(id);
    setClaim(c);
    setIsLoading(false);
  };

  const calculation = claim ? calculateClaimLaytime(claim) : null;

  const handleDownload = () => {
    if (!claim) return;
    exportClaimPdf(claim, calculation);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Voyage Reports & PDF Export Center</h1>
            <Badge variant="success">Client-Side PDF Engine</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate formal executive settlement statements, port reports, and Statement of Facts audits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={selectedClaimId}
            onChange={(e) => handleClaimChange(e.target.value)}
            className="w-72 text-xs font-semibold"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.shipName} ({c.accountName.split(" ")[0]})
              </option>
            ))}
          </Select>

          <Button onClick={handleDownload} className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" />
            <span>Download PDF Report</span>
          </Button>
        </div>
      </div>

      {/* Report Type Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setReportType("claim")}
          className={\`p-4 rounded-xl border cursor-pointer transition-all \${
            reportType === "claim"
              ? "bg-blue-50 border-blue-300 shadow-xs text-blue-900"
              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          }\`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Master Demurrage Claim Report</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Executive summary, financials, C/P terms & SoF log
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setReportType("port")}
          className={\`p-4 rounded-xl border cursor-pointer transition-all \${
            reportType === "port"
              ? "bg-blue-50 border-blue-300 shadow-xs text-blue-900"
              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          }\`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-white">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Port Operations Report</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Port-by-port laytime reconciliation & pumping rates
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setReportType("berth")}
          className={\`p-4 rounded-xl border cursor-pointer transition-all \${
            reportType === "berth"
              ? "bg-blue-50 border-blue-300 shadow-xs text-blue-900"
              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          }\`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-600 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Berth & Deductions Audit</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Detailed weather, rain, and shifting deductions log
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live PDF Document Preview Container */}
      {claim && calculation && (
        <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Live Document Print Preview
              </CardTitle>
            </div>
            <Button size="sm" onClick={handleDownload} className="text-xs flex items-center space-x-1.5">
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </Button>
          </CardHeader>

          <CardContent className="p-8 max-w-4xl mx-auto space-y-6 text-xs text-slate-800">
            {/* Header Box */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 block">
                  DEMURRAGE & LAYTIME STATEMENT OF CLAIM
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {claim.shipName} — {claim.claimName}
                </h2>
                <div className="text-[11px] text-slate-500 mt-1">
                  Claim ID: <strong>{claim.id}</strong> | Voyage: {claim.voyageNumber || "VOY-2024"} | Form: {claim.cpType}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Calculated Demurrage</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(calculation.finalPayableAmount)}
                </span>
              </div>
            </div>

            {/* Section 1: Commercial & Voyage Info */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                1. Commercial & Charterparty Terms
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Account / Client:</span>
                  <span className="font-semibold">{claim.accountName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Counterparty:</span>
                  <span className="font-semibold">{claim.counterpartyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Broker:</span>
                  <span className="font-semibold">{claim.brokerName || "Direct"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Demurrage Rate:</span>
                  <span className="font-semibold">{formatCurrency(claim.demurrageRatePerDay)}/day</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Charterparty Date:</span>
                  <span className="font-semibold">{formatDate(claim.charterpartyDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Voyage End Date:</span>
                  <span className="font-semibold">{formatDate(claim.voyageEndDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Notice Timebar:</span>
                  <span className="font-semibold">{claim.noticeTimebarDays} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Claim Timebar:</span>
                  <span className="font-semibold">{claim.claimTimebarDays} Days</span>
                </div>
              </div>
            </div>

            {/* Section 2: Laytime Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                2. Laytime & Deduction Calculations
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 p-3.5 rounded-lg border border-blue-200 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Allowed Laytime:</span>
                  <span className="font-bold text-slate-900">
                    {formatMinutesToDuration(calculation.totalAllowedMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gross Operations:</span>
                  <span className="font-bold text-slate-900">
                    {formatMinutesToDuration(calculation.totalGrossMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Deductions Allowed:</span>
                  <span className="font-bold text-rose-600">
                    {formatMinutesToDuration(calculation.totalDeductionsMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Net Demurrage Time:</span>
                  <span className="font-bold text-slate-900">
                    {formatMinutesToDuration(calculation.netDemurrageMinutes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Statement of Facts Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                3. Statement of Facts Activity Log
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold">
                    <tr>
                      <th className="p-2">Activity</th>
                      <th className="p-2">Start (UTC)</th>
                      <th className="p-2">Stop (UTC)</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2">% Count</th>
                      <th className="p-2">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(claim.activities || []).map((act) => (
                      <tr key={act.id}>
                        <td className="p-2 font-medium">{act.activityName}</td>
                        <td className="p-2 text-slate-500">{act.startTime}</td>
                        <td className="p-2 text-slate-500">{act.stopTime}</td>
                        <td className="p-2 font-bold">{act.durationFormatted}</td>
                        <td className="p-2">{act.percentageCounted}%</td>
                        <td className="p-2">{act.deductionCategory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/reports/page.tsx'), code, 'utf8');
console.log('Successfully wrote app/reports/page.tsx');
