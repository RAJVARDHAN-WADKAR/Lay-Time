import { PrismaClient, Role, UserStatus, ClaimStatus, DocumentType, PaymentStatus, NotificationType, RACSeverity, RACFindingStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Laytime & Demurrage Claim Management System database...');

  // 1. Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demurrageops.com' },
    update: {},
    create: {
      name: 'Sarah Jenkins (Admin)',
      email: 'admin@demurrageops.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const processor = await prisma.user.upsert({
    where: { email: 'processor@demurrageops.com' },
    update: {},
    create: {
      name: 'David Miller (Claim Processor)',
      email: 'processor@demurrageops.com',
      passwordHash,
      role: Role.CLAIM_PROCESSOR,
      status: UserStatus.ACTIVE,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@demurrageops.com' },
    update: {},
    create: {
      name: 'Elena Rostova (Commercial Supervisor)',
      email: 'supervisor@demurrageops.com',
      passwordHash,
      role: Role.SUPERVISOR,
      status: UserStatus.ACTIVE,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@demurrageops.com' },
    update: {},
    create: {
      name: 'Marcus Thorne (Senior Auditor)',
      email: 'reviewer@demurrageops.com',
      passwordHash,
      role: Role.REVIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Users seeded: Admin, Processor, Supervisor, Reviewer');

  // 2. Clients
  const clientsData = [
    { name: 'Trafigura Maritime Pte Ltd', contactName: 'Alexandre Mercer', email: 'demurrage@trafigura.com', phone: '+65 6838 2000' },
    { name: 'Vitol B.V. Tanker Desk', contactName: 'Clara van Dijk', email: 'claims@vitol.com', phone: '+31 10 498 7200' },
    { name: 'Shell Western Supply & Trading', contactName: 'James Sinclair', email: 'shipping.claims@shell.com', phone: '+44 20 7934 1234' },
    { name: 'Glencore Energy UK Ltd', contactName: 'Henrik Larsson', email: 'oilclaims@glencore.com', phone: '+44 20 7412 3000' },
    { name: 'Gunvor SA International Trading', contactName: 'Sophie Reynard', email: 'laytime@gunvorgroup.com', phone: '+41 22 716 6000' },
  ];

  const createdClients: any[] = [];
  for (const c of clientsData) {
    const cl = await prisma.client.create({ data: c });
    createdClients.push(cl);
  }

  // 3. Vessels
  const vesselsData = [
    { name: 'MT Nordic Pollux', imoNumber: '9456781', vesselType: 'Aframax Crude Tanker' },
    { name: 'MT Sea Leopard', imoNumber: '9678123', vesselType: 'Suezmax Crude Tanker' },
    { name: 'MV Baltic Trader', imoNumber: '9324567', vesselType: 'Ultramax Bulk Carrier' },
    { name: 'MT Pacific Glory', imoNumber: '9587412', vesselType: 'LR2 Product Tanker' },
    { name: 'MV Oceanic Pioneer', imoNumber: '9412356', vesselType: 'Handysize Bulker' },
    { name: 'MT Atlantic Breeze', imoNumber: '9789456', vesselType: 'MR Chemical Tanker' },
  ];

  const createdVessels: any[] = [];
  for (const v of vesselsData) {
    const ves = await prisma.vessel.create({ data: v });
    createdVessels.push(ves);
  }

  console.log('Clients and Vessels seeded');

  // 4. Claims (10 realistic claims)
  const claimsDefs = [
    {
      num: 'CLM-2024-001',
      name: 'MT Nordic Pollux — Europort Crude Disch',
      status: ClaimStatus.SETTLED,
      type: 'Discharge Port Demurrage',
      cp: 'ASBATANKVOY',
      cparty: 'TotalEnergies Trading SA',
      rate: 24000,
      filed: 24500,
      agreed: 18500,
      received: 18500,
      concluded: true,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 45 * 86400000),
      clientIdx: 0,
      vesselIdx: 0,
    },
    {
      num: 'CLM-2024-002',
      name: 'MT Sea Leopard — Ras Tanura Heavy Loading',
      status: ClaimStatus.REVIEW,
      type: 'Load Port Demurrage',
      cp: 'BPVOY4',
      cparty: 'Saudi Aramco Trading',
      rate: 28000,
      filed: 42100,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 15 * 86400000),
      clientIdx: 1,
      vesselIdx: 1,
    },
    {
      num: 'CLM-2024-003',
      name: 'MT Pacific Glory — Houston Ship Channel Weather',
      status: ClaimStatus.SUBMITTED,
      type: 'Combined Demurrage',
      cp: 'SHELLVOY6',
      cparty: 'Chevron Products Company',
      rate: 22000,
      filed: 28750,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 60,
      voyageEnd: new Date(Date.now() - 10 * 86400000),
      clientIdx: 2,
      vesselIdx: 3,
    },
    {
      num: 'CLM-2024-004',
      name: 'MT Atlantic Breeze — Antwerp Multi-Berth Chemical',
      status: ClaimStatus.INCOMPLETE,
      type: 'Discharge Port Demurrage',
      cp: 'BIMCO',
      cparty: 'BASF Antwerpen NV',
      rate: 18500,
      filed: 15200,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 5 * 86400000),
      clientIdx: 3,
      vesselIdx: 5,
    },
    {
      num: 'CLM-2024-005',
      name: 'MT Nordic Pollux — Singapore Outer Anchorage',
      status: ClaimStatus.SETTLED,
      type: 'Load Port Demurrage',
      cp: 'ASBATANKVOY',
      cparty: 'PetroChina International',
      rate: 25000,
      filed: 72000,
      agreed: 65000,
      received: 65000,
      concluded: true,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 70 * 86400000),
      clientIdx: 4,
      vesselIdx: 0,
    },
    {
      num: 'CLM-2024-006',
      name: 'MV Baltic Trader — Richards Bay Coal Despatch',
      status: ClaimStatus.SETTLED,
      type: 'Despatch',
      cp: 'GENCON',
      cparty: 'Anglo American Coal',
      rate: 16000,
      filed: 8400,
      agreed: 8400,
      received: 8400,
      concluded: true,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 30 * 86400000),
      clientIdx: 0,
      vesselIdx: 2,
    },
    {
      num: 'CLM-2024-007',
      name: 'MT Sea Leopard — Fujairah Bunkering Dispute',
      status: ClaimStatus.DISPUTED,
      type: 'Detention',
      cp: 'NYPE',
      cparty: 'Monjasa DMCC',
      rate: 30000,
      filed: 31500,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 60,
      voyageEnd: new Date(Date.now() - 40 * 86400000),
      clientIdx: 1,
      vesselIdx: 1,
    },
    {
      num: 'CLM-2024-008',
      name: 'MV Oceanic Pioneer — Santos Sugar Rain Delay',
      status: ClaimStatus.TIMEBARRED,
      type: 'Load Port Demurrage',
      cp: 'GENCON',
      cparty: 'Copersucar S.A.',
      rate: 15000,
      filed: 12800,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 60,
      voyageEnd: new Date(Date.now() - 95 * 86400000),
      clientIdx: 2,
      vesselIdx: 4,
    },
    {
      num: 'CLM-2024-009',
      name: 'MV Baltic Trader — Tubarao Iron Ore Congestion',
      status: ClaimStatus.INCOMPLETE,
      type: 'Load Port Demurrage',
      cp: 'GENCON',
      cparty: 'Vale International SA',
      rate: 20000,
      filed: 54000,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 8 * 86400000),
      clientIdx: 3,
      vesselIdx: 2,
    },
    {
      num: 'CLM-2024-010',
      name: 'MT Atlantic Breeze — Jubail Petrochem Prorata',
      status: ClaimStatus.REVIEW,
      type: 'Combined Demurrage',
      cp: 'BIMCO',
      cparty: 'SABIC Supply Chain BV',
      rate: 21000,
      filed: 22900,
      agreed: null,
      received: 0,
      concluded: false,
      tbDays: 90,
      voyageEnd: new Date(Date.now() - 20 * 86400000),
      clientIdx: 4,
      vesselIdx: 5,
    },
  ];

  for (const cd of claimsDefs) {
    const claim = await prisma.claim.create({
      data: {
        claimNumber: cd.num,
        claimName: cd.name,
        clientId: createdClients[cd.clientIdx].id,
        vesselId: createdVessels[cd.vesselIdx].id,
        status: cd.status,
        claimType: cd.type,
        charterpartyType: cd.cp,
        counterpartyName: cd.cparty,
        counterpartyType: 'Charterer',
        demurrageRatePerDay: cd.rate,
        claimFiledAmount: cd.filed,
        agreedAmount: cd.agreed,
        paymentReceived: cd.received,
        paymentConcluded: cd.concluded,
        voyageEndDate: cd.voyageEnd,
        noticeReceivedDate: new Date(cd.voyageEnd.getTime() - 5 * 86400000),
        claimTimebarDays: cd.tbDays,
        timebarred: cd.status === ClaimStatus.TIMEBARRED,
        assignedProcessorId: processor.id,
      },
    });

    // Port & Berths
    const port = await prisma.port.create({
      data: {
        claimId: claim.id,
        name: cd.name.split('—')[1]?.trim().split(' ')[0] || 'Main Terminal',
        loadRate: 6000,
        numberOfBerths: 2,
      },
    });

    const berth1 = await prisma.berth.create({
      data: {
        portId: port.id,
        name: 'Berth Alpha',
        quantity: 35000,
        loadRate: 6000,
        prorataPercentage: 60,
      },
    });

    const berth2 = await prisma.berth.create({
      data: {
        portId: port.id,
        name: 'Berth Bravo',
        quantity: 25000,
        loadRate: 6000,
        prorataPercentage: 40,
      },
    });

    // Statement of Facts & Activities
    const sof = await prisma.statementOfFacts.create({
      data: {
        claimId: claim.id,
        status: 'VERIFIED',
        extractionSource: 'OCR',
        verified: true,
      },
    });

    const t0 = new Date(cd.voyageEnd.getTime() - 4 * 86400000);
    const t1 = new Date(t0.getTime() + 6 * 3600000);
    const t2 = new Date(t1.getTime() + 18 * 3600000);
    const t3 = new Date(t2.getTime() + 32 * 3600000);
    const t4 = new Date(t3.getTime() + 4 * 3600000);
    const t5 = new Date(t4.getTime() + 12 * 3600000);

    await prisma.sOFActivity.createMany({
      data: [
        {
          sofId: sof.id,
          berthId: berth1.id,
          activityName: 'Notice of Readiness (NOR) Tendered',
          startTime: t0,
          stopTime: t0,
          durationMinutes: 0,
          percentageCounted: 100,
          deductionCategory: 'Others',
          ocrConfidence: 0.99,
          verified: true,
        },
        {
          sofId: sof.id,
          berthId: berth1.id,
          activityName: 'Contractual NOR 6-Hour Buffer Window',
          startTime: t0,
          stopTime: t1,
          durationMinutes: 360,
          percentageCounted: 0,
          deductionCategory: 'Others',
          ocrConfidence: 0.98,
          verified: true,
        },
        {
          sofId: sof.id,
          berthId: berth1.id,
          activityName: 'Waiting for Tidal Window at Anchorage',
          startTime: t1,
          stopTime: t2,
          durationMinutes: 1080,
          percentageCounted: 100,
          deductionCategory: 'Waiting for berth',
          ocrConfidence: 0.95,
          verified: true,
        },
        {
          sofId: sof.id,
          berthId: berth1.id,
          activityName: 'Commenced Discharging Operations',
          startTime: t2,
          stopTime: t3,
          durationMinutes: 1920,
          percentageCounted: 100,
          deductionCategory: 'Others',
          ocrConfidence: 0.97,
          verified: true,
        },
        {
          sofId: sof.id,
          berthId: berth1.id,
          activityName: 'Adverse Weather & High Swell Stoppage',
          startTime: t3,
          stopTime: t4,
          durationMinutes: 240,
          percentageCounted: 0,
          deductionCategory: 'Weather Delay',
          ocrConfidence: 0.93,
          verified: true,
        },
        {
          sofId: sof.id,
          berthId: berth2.id,
          activityName: 'Final Discharging & Hoses Disconnected',
          startTime: t4,
          stopTime: t5,
          durationMinutes: 720,
          percentageCounted: 100,
          deductionCategory: 'Others',
          ocrConfidence: 0.98,
          verified: true,
        },
      ],
    });

    // Calculation
    const allowedMins = 72 * 60;
    const netUsedMins = 84 * 60;
    const excessMins = 12 * 60;
    const demurrageAmount = Math.round((excessMins / 1440) * cd.rate);

    const calc = await prisma.calculation.create({
      data: {
        claimId: claim.id,
        grossElapsedMinutes: 90 * 60,
        totalDeductionMinutes: 10 * 60,
        countedDeductionMinutes: 6 * 60,
        netLaytimeUsedMinutes: netUsedMins,
        allowedLaytimeMinutes: allowedMins,
        excessLaytimeMinutes: excessMins,
        savedLaytimeMinutes: 0,
        demurrageAmount,
        despatchAmount: 0,
        finalClaimAmount: demurrageAmount,
        calculationBreakdown: {
          allowedLaytimeHours: 72,
          netLaytimeUsedHours: 84,
          excessHours: 12,
          ratePerDay: cd.rate,
        },
        deductions: {
          create: [
            {
              title: 'Adverse Weather & High Swell Stoppage',
              category: 'Weather Delay',
              startTime: t3,
              stopTime: t4,
              durationMinutes: 240,
              percentageCounted: 0,
              prorataPercentage: 100,
              countedDurationMinutes: 0,
            },
          ],
        },
      },
    });

    // RAC Analysis & Findings
    await prisma.rACAnalysis.create({
      data: {
        claimId: claim.id,
        calculationId: calc.id,
        score: cd.status === ClaimStatus.TIMEBARRED ? 45 : 92,
        overallStatus: 'COMPLETED',
        findings: {
          create: [
            {
              severity: cd.status === ClaimStatus.TIMEBARRED ? RACSeverity.CRITICAL : RACSeverity.WARNING,
              category: cd.status === ClaimStatus.TIMEBARRED ? 'TIMEBAR' : 'CALCULATION',
              title: cd.status === ClaimStatus.TIMEBARRED ? 'Claim Time-Bar Expired' : 'Weather Deduction Verification Recommended',
              description: 'Charterer may contest weather stoppage during shifting window.',
              recommendation: 'Verify official harbor master meteorological log.',
              status: RACFindingStatus.OPEN,
            },
            {
              severity: RACSeverity.INFO,
              category: 'DATA',
              title: 'Prorata Multi-Berth Share Verified',
              description: 'Berth 1 (60%) and Berth 2 (40%) correctly apportioned.',
              recommendation: 'No further action required.',
              status: RACFindingStatus.RESOLVED,
            },
          ],
        },
      },
    });

    // Owner calculation
    await prisma.ownerCalculation.create({
      data: {
        claimId: claim.id,
        laytimeUsedMinutes: 88 * 60,
        deductionsMinutes: 2 * 60,
        finalAmount: demurrageAmount + 4000,
      },
    });

    // Documents
    await prisma.document.createMany({
      data: [
        {
          claimId: claim.id,
          fileName: `SOF_${cd.num}.pdf`,
          documentType: DocumentType.SOF,
          fileType: 'application/pdf',
          fileSize: 1024 * 350,
          storagePath: `./uploads/SOF_${cd.num}.pdf`,
        },
        {
          claimId: claim.id,
          fileName: `Charterparty_${cd.cp}.pdf`,
          documentType: DocumentType.CHARTERPARTY,
          fileType: 'application/pdf',
          fileSize: 1024 * 1200,
          storagePath: `./uploads/Charterparty_${cd.cp}.pdf`,
        },
        {
          claimId: claim.id,
          fileName: `NOR_Tendered_${cd.num}.pdf`,
          documentType: DocumentType.NOR,
          fileType: 'application/pdf',
          fileSize: 1024 * 180,
          storagePath: `./uploads/NOR_${cd.num}.pdf`,
        },
      ],
    });
  }

  // 5. System Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: processor.id,
        type: NotificationType.TIMEBAR_WARNING,
        title: 'Urgent: 10 Days Remaining on CLM-2024-003',
        message: 'Contractual 60-day time-bar approaching for Chevron Products claim.',
      },
      {
        userId: supervisor.id,
        type: NotificationType.CLAIM_REVIEW,
        title: 'Claim Ready for Sign-Off: CLM-2024-002',
        message: 'David Miller submitted Ras Tanura claim ($42,100) for supervisor commercial review.',
      },
      {
        userId: admin.id,
        type: NotificationType.RAC_WARNING,
        title: 'RAC Flagged Inverted Timestamp on Draft Claim',
        message: 'Discrepancy detected between NOR tender and berth arrival.',
      },
    ],
  });

  console.log('Database seeding successfully completed with 10 realistic claims, RAC findings, and notifications!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });