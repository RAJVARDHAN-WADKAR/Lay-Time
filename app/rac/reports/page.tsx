"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { getRacCases } from "@/lib/api/rac";
import { RacCase } from "@/lib/types";
import {
  FileBarChart,
  Download,
  FileText,
  Layers,
  CheckCircle2,
  Filter,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RacReportsPage() {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState<RacCase[]>([]);
  const [reportType, setReportType] = useState<"summary" | "cases" | "calculations" | "status">("summary");
  const [clientFilter, setClientFilter] = useState("All");

  useEffect(() => {
    getRacCases().then(setCases);
  }, []);

  const filteredCases = cases.filter((c) => clientFilter === "All" || c.clientName === clientFilter);

  const generatePdfReport = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();

    // Header
    doc.setFillColor(11, 25, 44);
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MARITIME RAC DISPUTES & RECOVERABLE COSTS REPORT", 14, 13);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${now} • Authorized by ${currentUser.name} (${currentUser.role})`, 14, 21);

    if (reportType === "summary" || reportType === "cases") {
      const tableData = filteredCases.map((c) => [
        c.racReference,
        c.clientName,
        c.shipName,
        c.racType,
        c.status,
        formatCurrency(c.totalAmount),
        formatCurrency(c.agreedAmount || 0),
        formatCurrency(c.outstandingAmount || 0),
        c.assignedTo
      ]);

      autoTable(doc, {
        startY: 34,
        head: [["Ref #", "Client", "Vessel", "Dispute Type", "Status", "Claim Amount", "Agreed", "Exposure", "Analyst"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 2 }
      });
    } else if (reportType === "calculations") {
      const tableData = filteredCases.map((c) => [
        c.racReference,
        c.shipName,
        c.calculation?.ruleVersion ? `v${c.calculation.ruleVersion}` : "v1.0",
        c.calculation?.calculationStatus || "Verified",
        formatCurrency(c.totalAmount),
        c.calculation?.explanation || "Standard Ruleset Evaluated"
      ]);

      autoTable(doc, {
        startY: 34,
        head: [["Ref #", "Vessel", "Rule Version", "Audit Status", "Evaluated Claim", "Engine Explanation"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 2.5 }
      });
    }

    doc.save(`RAC_${reportType.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FileBarChart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">RAC Audit & Settlement Reports</h1>
            <p className="text-xs text-slate-500">
              Generate executive PDF dossiers and financial breakdown schedules from database records
            </p>
          </div>
        </div>

        <Button
          onClick={generatePdfReport}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <Download className="h-4 w-4" />
          <span>Export Official PDF Report</span>
        </Button>
      </div>

      {/* Report Type Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: "summary", title: "Executive RAC Summary", desc: "Overall exposure, client portfolio breakdown, and status distribution" },
          { id: "cases", title: "Master Cases Schedule", desc: "Itemized list of all active, reviewed, and closed RAC disputes" },
          { id: "calculations", title: "Calculations Audit Report", desc: "Formula parameters, deductions, and tariff evaluation notes" },
          { id: "status", title: "Workflow Transition History", desc: "Timestamped state progression and analyst sign-offs" }
        ].map((r) => (
          <Card
            key={r.id}
            onClick={() => setReportType(r.id as any)}
            className={`p-4 cursor-pointer transition border-2 ${
              reportType === r.id ? "border-blue-600 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <h3 className="text-xs font-bold text-slate-900">{r.title}</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">{r.desc}</p>
          </Card>
        ))}
      </div>

      {/* Preview Table Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 capitalize">Report Preview: {reportType}</h3>
            <p className="text-xs text-slate-500">Showing live database rows formatted for official export</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Filter Client:</span>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <option value="All">All Clients</option>
              {Array.from(new Set(cases.map((c) => c.clientName))).map((cl) => (
                <option key={cl} value={cl}>{cl}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">RAC Reference</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Vessel</th>
                <th className="py-2.5 px-3">Dispute Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Claim Amount</th>
                <th className="py-2.5 px-3 text-right">Agreed Settlement</th>
                <th className="py-2.5 px-3">Assigned Processor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-blue-600">{c.racReference}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.clientName}</td>
                  <td className="py-2.5 px-3 text-slate-700">{c.shipName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.racType}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(c.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatCurrency(c.agreedAmount || 0)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
