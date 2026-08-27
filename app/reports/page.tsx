"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getClaims } from "@/lib/api";
import { Claim } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { exportToCSV } from "@/lib/utils/exportCsv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/inputs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/hooks/useToast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileBarChart,
  Download,
  Filter,
  FileSpreadsheet,
  Printer,
  Ship,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function ReportsPage() {
  const { success, info } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reportType, setReportType] = useState<string>("demurrage_summary");
  const [selectedClient, setSelectedClient] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchClaims = async () => {
    setIsLoading(true);
    const data = await getClaims();
    setClaims(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClaims();

    const handleStorage = () => fetchClaims();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const uniqueClients = useMemo(() => {
    const set = new Set(claims.map((c) => c.accountName).filter(Boolean));
    return Array.from(set);
  }, [claims]);

  // Filtered claims for report
  const reportClaims = useMemo(() => {
    if (!isGenerated && claims.length === 0) return [];

    return claims.filter((claim) => {
      if (selectedClient !== "ALL" && claim.accountName !== selectedClient) {
        return false;
      }
      if (startDate) {
        const claimTime = new Date(claim.createdAt).getTime();
        const startTime = new Date(startDate).getTime();
        if (!isNaN(claimTime) && !isNaN(startTime) && claimTime < startTime) return false;
      }
      if (endDate) {
        const claimTime = new Date(claim.createdAt).getTime();
        const endTime = new Date(endDate).getTime();
        if (!isNaN(claimTime) && !isNaN(endTime) && claimTime > endTime) return false;
      }
      return true;
    });
  }, [claims, selectedClient, startDate, endDate, isGenerated]);

  // Summary Metrics computed from actual database records
  const reportMetrics = useMemo(() => {
    let totalFiled = 0;
    let totalReceived = 0;
    let totalExposure = 0;
    let totalDaysOpen = 0;

    for (const c of reportClaims) {
      const filed = Number(c.claimFiledAmount) || 0;
      const rec = Number(c.paymentReceived) || 0;
      totalFiled += filed;
      totalReceived += rec;
      totalExposure += Math.max(filed - rec, 0);
      totalDaysOpen += Number(c.daysOpen) || 0;
    }

    const avgDays = reportClaims.length > 0 ? Math.round(totalDaysOpen / reportClaims.length) : 0;

    return {
      totalFiled,
      totalReceived,
      totalExposure,
      avgDays,
      count: reportClaims.length,
    };
  }, [reportClaims]);

  const handleGenerateReport = () => {
    setIsGenerated(true);
    if (claims.length === 0) {
      info("No Data", "No claims found in the database. Create claims to generate reports.");
    } else {
      success("Report Generated", `Compiled report with ${reportClaims.length} records.`);
    }
  };

  const handleExportPDF = () => {
    if (reportClaims.length === 0) return;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LAYTIME CALCULATION SYSTEM", 14, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Executive Maritime Demurrage & Claims Report", 14, 25);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${selectedClient}`, 14, 31);

    // Summary Metrics
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT SUMMARY", 14, 40);

    const summaryData = [
      ["Total Claims Analyzed", `${reportMetrics.count} Voyages`],
      ["Total Demurrage Filed", formatCurrency(reportMetrics.totalFiled)],
      ["Demurrage Recovered", formatCurrency(reportMetrics.totalReceived)],
      ["Outstanding Exposure", formatCurrency(reportMetrics.totalExposure)],
      ["Average Processing Days", `${reportMetrics.avgDays} Days`],
    ];

    autoTable(doc, {
      startY: 44,
      body: summaryData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    });

    // Claims Breakdown
    const tableData = reportClaims.map((c) => [
      c.id,
      c.shipName,
      c.accountName,
      c.cpType,
      c.claimStatus,
      formatCurrency(c.claimFiledAmount),
      formatCurrency(c.paymentReceived || 0),
      `${c.daysOpen || 0}d`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Claim No.", "Ship Name", "Client", "CP Type", "Status", "Demurrage (USD)", "Received", "Days"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [11, 25, 44] },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    doc.save(`laytime_report_${new Date().toISOString().split("T")[0]}.pdf`);
    success("Export Complete", "Report exported as PDF");
  };

  const handleExportExcel = () => {
    if (reportClaims.length === 0) return;
    exportToCSV(reportClaims, `laytime_claims_report_${new Date().toISOString().split("T")[0]}`);
    success("Export Complete", "Report exported as Excel CSV");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Reports &amp; Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate executive demurrage settlement statements, aging analyses, and port turnaround reports
          </p>
        </div>
      </div>

      {/* FILTERS & GENERATE CONTROLS matching Section 16 */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>Report Parameters</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure report type, account filter, and voyage operational date window
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-left">
            {/* Filter: Report Type */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Report Type</label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-9 text-xs bg-white"
              >
                <option value="demurrage_summary">Demurrage Summary Report</option>
                <option value="claim_aging">Claim Aging Report</option>
                <option value="vessel_performance">Vessel Performance Report</option>
                <option value="client_exposure">Client Exposure Analysis</option>
                <option value="port_turnaround">Port Turnaround & Delay Analysis</option>
              </Select>
            </div>

            {/* Filter: Client */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Client / Account</label>
              <Select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="h-9 text-xs bg-white"
              >
                <option value="ALL">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filter: Date Range Start */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            {/* Filter: Date Range End */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 mt-4 border-t border-slate-100">
            <Button
              size="sm"
              onClick={handleGenerateReport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-6 rounded-xl shadow-xs"
            >
              <FileBarChart className="h-4 w-4 mr-1.5" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* REPORT PREVIEW SECTION matching Section 16 */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>Report Preview</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {reportClaims.length > 0
                ? `Generated preview based on ${reportClaims.length} active database records`
                : "No report compiled"}
            </CardDescription>
          </div>

          {/* Export Options: Export PDF & Export Excel */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={reportClaims.length === 0}
              className="text-xs h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5"
            >
              <Download className="h-4 w-4 text-rose-600" />
              <span>Export PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={reportClaims.length === 0}
              className="text-xs h-9 px-3.5 bg-white rounded-xl flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Excel</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {reportClaims.length > 0 ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-left">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Total Demurrage</span>
                  <span className="text-xl font-extrabold text-blue-900 mt-1 block">
                    {formatCurrency(reportMetrics.totalFiled)}
                  </span>
                  <span className="text-[10px] text-blue-600 mt-0.5 block">{reportMetrics.count} Claims</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-left">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Collected Funds</span>
                  <span className="text-xl font-extrabold text-emerald-900 mt-1 block">
                    {formatCurrency(reportMetrics.totalReceived)}
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">Recovered</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-left">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Outstanding Balance</span>
                  <span className="text-xl font-extrabold text-amber-900 mt-1 block">
                    {formatCurrency(reportMetrics.totalExposure)}
                  </span>
                  <span className="text-[10px] text-amber-600 mt-0.5 block">Pending settlement</span>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-left">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Average Duration</span>
                  <span className="text-xl font-extrabold text-purple-900 mt-1 block">
                    {reportMetrics.avgDays} <span className="text-xs font-normal">days</span>
                  </span>
                  <span className="text-[10px] text-purple-600 mt-0.5 block">Open processing</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Claim No.</th>
                      <th className="py-3 px-4">Ship Name</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Filed Amount</th>
                      <th className="py-3 px-4 text-right">Payment Received</th>
                      <th className="py-3 px-4 text-right">Days Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {reportClaims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{c.shipName}</td>
                        <td className="py-3 px-4 text-slate-600">{c.accountName}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.claimStatus} />
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(c.claimFiledAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                          {formatCurrency(c.paymentReceived || 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-medium">
                          {c.daysOpen || 0}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={FileBarChart}
                title="No report data available"
                description="Click 'Generate Report' above or add claims to generate comprehensive voyage reports."
                actionText={claims.length === 0 ? "Create First Claim" : undefined}
                actionHref={claims.length === 0 ? "/claims/create" : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
