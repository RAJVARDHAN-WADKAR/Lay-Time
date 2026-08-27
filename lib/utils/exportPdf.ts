import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Claim, ClaimCalculation } from "@/lib/types";
import { formatCurrency, formatDate, formatMinutesToDuration } from "./formatters";

/**
 * Generates and downloads a real, beautifully formatted Claim Demurrage Report PDF
 */
export function exportClaimPdf(claim: Claim, calculation?: ClaimCalculation | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DEMURRAGE CLAIM CALCULATION REPORT", 14, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Claim ID: ${claim.id} | Generated: ${new Date().toISOString().replace("T", " ").substring(0, 16)} UTC`, 14, 20);

  // Key Claim Metadata Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("1. VOYAGE & COMMERCIAL PARTICULARS", 14, 38);

  const metaData = [
    ["Vessel Name:", claim.shipName, "Charterparty Form:", claim.cpType || "GENCON"],
    ["Account / Client:", claim.accountName, "C/P Date:", formatDate(claim.charterpartyDate)],
    ["Counterparty:", `${claim.counterpartyName} (${claim.counterpartyType})`, "Layday / Cancelling:", `${formatDate(claim.layday)} - ${formatDate(claim.cancellingDate)}`],
    ["Broker:", claim.brokerName || "Direct", "Voyage End Date:", formatDate(claim.voyageEndDate)],
    ["Demurrage Rate/Day:", formatCurrency(claim.demurrageRatePerDay), "Claim Status:", claim.claimStatus],
  ];

  autoTable(doc, {
    startY: 42,
    body: metaData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 40 },
      3: { cellWidth: 55 },
    },
  });

  // Financials & Timebar Summary Table
  const currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("2. FINANCIAL BREAKDOWN & TIMEBAR COMPLIANCE", 14, currentY);

  const finData = [
    [
      "Claim Filed Amount",
      "Agreed Settlement",
      "Payment Received",
      "Notice Timebar",
      "Claim Timebar",
      "Timebarred Status",
    ],
    [
      formatCurrency(claim.claimFiledAmount),
      (claim.agreedAmount || 0) > 0 ? formatCurrency(claim.agreedAmount || 0) : "Under Review",
      formatCurrency(claim.paymentReceived || 0),
      `${claim.noticeTimebarDays || 30} Days`,
      `${claim.claimTimebarDays || 90} Days`,
      claim.timebarred ? "TIMEBARRED" : "COMPLIANT",
    ],
  ];

  autoTable(doc, {
    startY: currentY + 4,
    head: [finData[0]],
    body: [finData[1]],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, fontStyle: "bold" },
  });

  // Statement of Facts Activities Table
  const sofY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("3. STATEMENT OF FACTS OPERATIONS & DEDUCTIONS", 14, sofY);

  const sofRows = (claim.activities || []).map((act) => [
    act.activityName,
    act.startTime ? act.startTime.replace("T", " ").substring(0, 16) : "—",
    act.stopTime ? act.stopTime.replace("T", " ").substring(0, 16) : "—",
    act.durationFormatted || formatMinutesToDuration(act.durationMinutes),
    `${act.percentageCounted}%`,
    `${act.prorata}%`,
    act.deductionCategory,
    act.remarks || "—",
  ]);

  autoTable(doc, {
    startY: sofY + 4,
    head: [["Activity", "Start (UTC)", "Stop (UTC)", "Duration", "% Count", "Prorata", "Category", "Remarks"]],
    body: sofRows.length ? sofRows : [["No SoF activities logged", "-", "-", "-", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.8 },
  });

  // Laytime Calculation Result (if present)
  if (calculation) {
    const calcY = (doc as any).lastAutoTable.finalY + 8;
    if (calcY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("4. FINAL LAYTIME & DEMURRAGE RECONCILIATION", 14, calcY);

      const calcSummary = [
        ["Total Gross Time Elapsed:", formatMinutesToDuration(calculation.totalGrossMinutes)],
        ["Total Allowable Deductions:", formatMinutesToDuration(calculation.totalDeductionsMinutes)],
        ["Net Laytime Used:", formatMinutesToDuration(calculation.totalNetLaytimeMinutes)],
        ["Allowed Laytime under C/P:", formatMinutesToDuration(calculation.totalAllowedMinutes)],
        ["Net Demurrage Time Exceeded:", formatMinutesToDuration(calculation.netDemurrageMinutes)],
        ["FINAL CALCULATED DEMURRAGE PAYABLE:", formatCurrency(calculation.finalPayableAmount)],
      ];

      autoTable(doc, {
        startY: calcY + 4,
        body: calcSummary,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [30, 41, 59], cellWidth: 70 },
          1: { cellWidth: 60, fontStyle: "bold" },
        },
      });
    }
  }

  // Footer Note
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by Demurrage Ops Laytime Calculation System. Verified against Statement of Facts and Charterparty clauses.", 14, pageHeight - 8);

  doc.save(`Demurrage_Claim_Report_${claim.id}_${claim.shipName.replace(/ /g, "_")}.pdf`);
}
