const fs = require('fs');
const path = require('path');

const vessels = [
  { id: "CLM-2024-001", name: "MV Ocean Titan - Rotterdam Crude Discharge", ship: "MV Ocean Titan", client: "Trafigura Trading Pte Ltd", broker: "Braemar ACM", status: "Submitted", type: "Discharge Port Demurrage", cp: "BPVOY4", rate: 32000, filed: 114500, rec: 0, agr: 0, days: 18, port: "Port of Rotterdam", berth: "Vopak Terminal EuroTank 4", qty: 65000, lRate: 45000, cargo: "Urals Crude", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-002", name: "MV Nordic Voyager - Singapore Multi-Berth Discharging", ship: "MV Nordic Voyager", client: "Glencore International AG", broker: "Clarksons Platou", status: "Review", type: "Discharge Port Demurrage", cp: "ASBATANKVOY", rate: 28500, filed: 182400, rec: 0, agr: 165000, days: 34, port: "Port of Singapore", berth: "Jurong Island Berth 3", qty: 45000, lRate: 36000, cargo: "Fuel Oil 380cSt", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-003", name: "MT Pacific Glory - Houston Ship Channel Loading", ship: "MT Pacific Glory", client: "Shell Global Eastern", broker: "Simpson Spence Young", status: "Settled", type: "Load Port Demurrage", cp: "SHELLVOY6", rate: 24000, filed: 98400, rec: 92000, agr: 92000, days: 62, port: "Houston Ship Channel", berth: "Enterprise Hydrocarbon Terminal 2", qty: 50000, lRate: 40000, cargo: "WTI Crude", assigned: "Marcus Aurelius" },
  { id: "CLM-2024-004", name: "MV Baltic Trader - Antwerp Grain Loading (OCR Messy Sample)", ship: "MV Baltic Trader", client: "Cargill International SA", broker: "Howe Robinson", status: "Incomplete", type: "Load Port Demurrage", cp: "GENCON", rate: 19500, filed: 64200, rec: 0, agr: 0, days: 9, port: "Port of Antwerp", berth: "Katoen Natie Grain Terminal Pier 1", qty: 38000, lRate: 20000, cargo: "Wheat in Bulk", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-005", name: "MT Aegean Horizon - Ras Tanura Loading", ship: "MT Aegean Horizon", client: "BP Maritime", broker: "E.A. Gibson", status: "Timebarred", type: "Load Port Demurrage", cp: "BPVOY4", rate: 45000, filed: 215000, rec: 0, agr: 0, days: 110, port: "Ras Tanura Terminal", berth: "Sea Island Berth 15", qty: 130000, lRate: 60000, cargo: "Arab Heavy Crude", assigned: "Marcus Aurelius" },
  { id: "CLM-2024-006", name: "MV Starlight Ace - Richards Bay Coal Loading", ship: "MV Starlight Ace", client: "Gunvor Group", broker: "SSY London", status: "Disputed", type: "Load Port Demurrage", cp: "NYPE", rate: 22000, filed: 142000, rec: 0, agr: 0, days: 45, port: "Richards Bay Coal Terminal", berth: "RBCT Berth 301", qty: 85000, lRate: 50000, cargo: "Steam Coal 6000kcal", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-007", name: "MT Golden Dynamic - Fujairah Offshore STS", ship: "MT Golden Dynamic", client: "Vitol Group", broker: "Fearnleys", status: "Submitted", type: "Combined Demurrage", cp: "ASBATANKVOY", rate: 35000, filed: 87500, rec: 0, agr: 0, days: 12, port: "Fujairah Offshore Anchorage", berth: "STS Location Charlie-2", qty: 40000, lRate: 25000, cargo: "VLSFO", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-008", name: "MV Poseidon Leader - Santos Sugar Loading", ship: "MV Poseidon Leader", client: "Koch Supply & Trading", broker: "Banchero Costa", status: "Settled", type: "Load Port Demurrage", cp: "GENCON", rate: 18000, filed: 60000, rec: 54000, agr: 54000, days: 50, port: "Port of Santos", berth: "Rumo Sugar Terminal Berth 2", qty: 32000, lRate: 15000, cargo: "Raw Sugar in Bulk", assigned: "Marcus Aurelius" },
  { id: "CLM-2024-009", name: "MT Atlas Star - Dampier Iron Ore Despatch", ship: "MT Atlas Star", client: "TotalEnergies Trading", broker: "Affinity Shipping", status: "Review", type: "Despatch", cp: "BIMCO", rate: 22000, filed: -19800, rec: 0, agr: -19800, days: 22, port: "Port of Dampier", berth: "Parker Point Berth 4", qty: 90000, lRate: 70000, cargo: "Iron Ore Fines", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-010", name: "MV Gulf Pioneer - Corpus Christi Condensate", ship: "MV Gulf Pioneer", client: "Chevron Marine Products", broker: "Braemar ACM", status: "Submitted", type: "Load Port Demurrage", cp: "ASBATANKVOY", rate: 30000, filed: 72500, rec: 0, agr: 0, days: 6, port: "Corpus Christi Harbor", berth: "Ingleside Oil Terminal Berth 1", qty: 55000, lRate: 40000, cargo: "Eagle Ford Condensate", assigned: "Marcus Aurelius" },
  { id: "CLM-2024-011", name: "MV Atlantic Crown - Hamburg Fertilizer Discharge", ship: "MV Atlantic Crown", client: "Trafigura Trading Pte Ltd", broker: "Clarksons Platou", status: "Settled", type: "Discharge Port Demurrage", cp: "GENCON", rate: 17500, filed: 48000, rec: 42500, agr: 42500, days: 75, port: "Port of Hamburg", berth: "Kalikai Bulk Terminal Berth 3", qty: 26000, lRate: 18000, cargo: "Potash Fertilizer", assigned: "Sarah Jenkins" },
  { id: "CLM-2024-012", name: "MT Arctic Mariner - Mongstad Condensate Loading", ship: "MT Arctic Mariner", client: "Shell Global Eastern", broker: "Howe Robinson", status: "Submitted", type: "Load Port Demurrage", cp: "SHELLVOY6", rate: 38000, filed: 126000, rec: 0, agr: 0, days: 4, port: "Mongstad Refinery Terminal", berth: "Jetty 2 Crude Berth", qty: 75000, lRate: 50000, cargo: "Gullfaks Crude", assigned: "Marcus Aurelius" }
];

const claims = vessels.map((v, idx) => {
  const isSettled = v.status === "Settled";
  const isTimebarred = v.status === "Timebarred";
  const isAntwerp = v.id === "CLM-2024-004";
  const isSingapore = v.id === "CLM-2024-002";

  const portId = `port-${idx + 1}`;
  const berthId = `berth-${idx + 1}-1`;
  const berth2Id = `berth-${idx + 1}-2`;

  const berths = [
    {
      id: berthId,
      portId: portId,
      name: v.berth,
      quantity: isSingapore ? 45000 : v.qty,
      prorataShare: isSingapore ? 60 : 100,
      isProrataOverridden: false,
      loadRate: v.lRate,
      cargoType: v.cargo
    }
  ];

  if (isSingapore) {
    berths.push({
      id: berth2Id,
      portId: portId,
      name: "Jurong Island Berth 4",
      quantity: 30000,
      prorataShare: 40,
      isProrataOverridden: false,
      loadRate: 36000,
      cargoType: "Gas Oil 0.1%"
    });
  }

  const activities = [
    {
      id: `act-${idx + 1}-1`,
      claimId: v.id,
      portId: portId,
      berthId: berthId,
      activityName: "Vessel arrived",
      startTime: "2024-07-10T04:00:00Z",
      stopTime: "2024-07-10T04:30:00Z",
      durationMinutes: 30,
      durationFormatted: "00h 30m",
      percentageCounted: 100,
      prorata: isSingapore ? 60 : 100,
      deductionCategory: "Other",
      isOcrExtracted: true,
      ocrConfidence: 0.98
    },
    {
      id: `act-${idx + 1}-2`,
      claimId: v.id,
      portId: portId,
      berthId: berthId,
      activityName: "NOR tendered",
      startTime: "2024-07-10T04:30:00Z",
      stopTime: "2024-07-10T10:30:00Z",
      durationMinutes: 360,
      durationFormatted: "06h 00m",
      percentageCounted: 0,
      prorata: isSingapore ? 60 : 100,
      deductionCategory: "Waiting for berth",
      remarks: "6 hours Notice time allowance under Clause 6",
      isOcrExtracted: true,
      ocrConfidence: 0.94
    },
    {
      id: `act-${idx + 1}-3`,
      claimId: v.id,
      portId: portId,
      berthId: isAntwerp ? "" : berthId, // intentional missing berth on Antwerp
      activityName: isAntwerp ? "Equipment breakdown" : "Waiting for berth",
      startTime: isAntwerp ? "2024-07-27T08:00:00Z" : "2024-07-10T10:30:00Z",
      stopTime: isAntwerp ? "2024-07-27T18:00:00Z" : "2024-07-11T12:00:00Z",
      durationMinutes: isAntwerp ? 600 : 1530,
      durationFormatted: isAntwerp ? "10h 00m" : "1d 01h 30m",
      percentageCounted: isAntwerp ? 0 : 100,
      prorata: isSingapore ? 60 : 100,
      deductionCategory: isAntwerp ? "Equipment breakdown" : "Waiting for berth",
      isOcrExtracted: true,
      ocrConfidence: isAntwerp ? 0.65 : 0.92
    },
    {
      id: `act-${idx + 1}-4`,
      claimId: v.id,
      portId: portId,
      berthId: berthId,
      activityName: isAntwerp ? "Rain" : "Rain",
      startTime: isAntwerp ? "2024-07-26T20:00:00Z" : "2024-07-12T16:00:00Z",
      stopTime: isAntwerp ? "2024-07-26T14:00:00Z" : "2024-07-13T01:00:00Z", // intentional stop before start on Antwerp
      durationMinutes: isAntwerp ? -360 : 540,
      durationFormatted: isAntwerp ? "-06h 00m" : "09h 00m",
      percentageCounted: isAntwerp ? 0 : 50,
      prorata: isSingapore ? 60 : 100,
      deductionCategory: "Rain",
      remarks: isAntwerp ? "OCR read 14:00 instead of 02:00 next day" : "Rain delay",
      isOcrExtracted: true,
      ocrConfidence: isAntwerp ? 0.62 : 0.88,
      originalOcrValues: isAntwerp ? { startTime: "2024-07-26T20:00:00Z", stopTime: "2024-07-26T14:00:00Z" } : undefined
    }
  ];

  if (isAntwerp) {
    activities.push({
      id: `act-${idx + 1}-5`,
      claimId: v.id,
      portId: portId,
      berthId: berthId,
      activityName: "Rain", // duplicate activity
      startTime: "2024-07-26T20:00:00Z",
      stopTime: "2024-07-26T20:30:00Z",
      durationMinutes: 30,
      durationFormatted: "00h 30m",
      percentageCounted: 0,
      prorata: 100,
      deductionCategory: "Rain",
      isOcrExtracted: true,
      ocrConfidence: 0.71
    });
  }

  return {
    id: v.id,
    claimName: v.name,
    accountName: v.client,
    brokerName: v.broker,
    claimStatus: v.status,
    claimType: v.type,
    shipName: v.ship,
    cpType: v.cp,
    voyageNumber: `VOY-2024-0${idx + 1}A`,
    assignedTo: v.assigned,
    daysOpen: v.days,
    claimClosed: isSettled || isTimebarred,
    contentions: isTimebarred ? "Claim timebarred under C/P Clause 20 (exceeded 90 days)." : (isAntwerp ? "Discrepancy engine flagged start after stop and missing berth." : "Operational deductions disputed by charterer."),
    claimNotes: `Demurrage rate $${v.rate.toLocaleString()}/day. Handled by ${v.assigned}.`,
    documentLinks: [`SOF_${v.ship.replace(/ /g, '_')}.pdf`, `CP_${v.client.split(' ')[0]}_${v.cp}.pdf`],
    demurrageRatePerDay: v.rate,
    counterpartyName: `${v.client.split(' ')[0]} Trading SA`,
    counterpartyType: "Charterer",
    claimFiledAmount: v.filed,
    receivedClaimAmount: v.rec,
    agreedAmount: v.agr,
    billableAmount: isSettled ? v.agr : (isTimebarred ? 0 : v.filed),
    paymentReceived: v.rec,
    paymentConcluded: isSettled,
    layday: "2024-07-01",
    cancellingDate: "2024-07-08",
    voyageEndDate: isTimebarred ? "2024-03-15" : "2024-07-14",
    instructionReceivedDate: isTimebarred ? "2024-04-10" : "2024-07-15",
    noticeReceivedDate: isTimebarred ? "2024-04-20" : "2024-07-16",
    claimReceivedDate: isTimebarred ? "2024-06-27" : "2024-07-25",
    noticeTimebarDays: 30,
    claimTimebarDays: 90,
    timebarred: isTimebarred,
    claimAgreedDate: isSettled ? "2024-07-28" : undefined,
    charterpartyDate: isTimebarred ? "2024-02-15" : "2024-06-20",
    daysAwaitingPayment: isSettled ? 0 : v.days,
    createdAt: "2024-07-15T09:00:00Z",
    updatedAt: "2024-08-20T14:20:00Z",
    ports: [
      {
        id: portId,
        claimId: v.id,
        name: v.port,
        portType: v.type.includes("Discharge") ? "Discharge Port" : "Load Port",
        loadRate: v.lRate,
        berths
      }
    ],
    activities
  };
});

const documents = [
  { id: "doc-101", claimId: "CLM-2024-001", claimName: "MV Ocean Titan - Rotterdam Crude Discharge", fileName: "SOF_OceanTitan_Rotterdam.pdf", fileSize: 2450000, fileType: "application/pdf", uploadedAt: "2024-07-16T10:15:00Z", status: "OCR Completed", ocrConfidence: 0.95, extractedItemsCount: 7 },
  { id: "doc-102", claimId: "CLM-2024-002", claimName: "MV Nordic Voyager - Singapore Multi-Berth Discharging", fileName: "SOF_NordicVoyager_SGP.pdf", fileSize: 3120000, fileType: "application/pdf", uploadedAt: "2024-07-10T14:30:00Z", status: "OCR Completed", ocrConfidence: 0.93, extractedItemsCount: 5 },
  { id: "doc-103", claimId: "CLM-2024-004", claimName: "MV Baltic Trader - Antwerp Grain Loading (OCR Messy Sample)", fileName: "Scanned_SoF_Antwerp_BadScan.pdf", fileSize: 4800000, fileType: "application/pdf", uploadedAt: "2024-08-07T09:12:00Z", status: "OCR Completed", ocrConfidence: 0.68, extractedItemsCount: 5 },
  { id: "doc-104", claimId: "CLM-2024-006", claimName: "MV Starlight Ace - Richards Bay Coal Loading", fileName: "SOF_RichardsBay_Coal.pdf", fileSize: 1850000, fileType: "application/pdf", uploadedAt: "2024-07-02T11:45:00Z", status: "OCR Completed", ocrConfidence: 0.91, extractedItemsCount: 4 },
  { id: "doc-105", claimId: "CLM-2024-004", claimName: "MV Baltic Trader - Antwerp Grain Loading (OCR Messy Sample)", fileName: "corrupted_sof_scan_demo.pdf", fileSize: 850000, fileType: "application/pdf", uploadedAt: "2024-08-15T08:20:00Z", status: "OCR Failed", errorReason: "Corrupted PDF stream / Unreadable low DPI image scan (demo error case)." }
];

const fileContent = `import { Claim, DocumentRecord, User } from "@/lib/types";
export { MOCK_USERS } from "./users";

export const MOCK_CLAIMS: Claim[] = ${JSON.stringify(claims, null, 2)};
export const MOCK_DOCUMENTS: DocumentRecord[] = ${JSON.stringify(documents, null, 2)};
`;

fs.writeFileSync(path.join(process.cwd(), 'lib/mock/data.ts'), fileContent, 'utf8');
console.log('Successfully wrote data.ts with', claims.length, 'claims and', documents.length, 'documents');
