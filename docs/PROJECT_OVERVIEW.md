# Lay-Time / Demurrage Claim Management System — Project Overview

## 1. Executive Summary

The **Lay-Time / Demurrage Claim Management System** is a mission-critical web application designed for commercial maritime post-fixture operations, dry bulk and liquid tanker operators, charterers, shipowners, commodity trading houses, and maritime legal auditors. 

The software automates the tracking, calculation, dispute management, and financial recovery of **laytime**, **demurrage**, and **despatch** across global ocean-going voyages. By parsing Statement of Facts (SoF), Notice of Readiness (NOR), charter party agreements, and port logs, the platform eliminates manual spreadsheet errors, identifies contractual timebar risks, detects operational sequence discrepancies, and facilitates multi-party settlement.

---

## 2. Core Business Problems Solved

In international ocean freight under voyage charter contracts, charterers and shipowners enter into high-stakes financial agreements. Cargo handling operations (loading and discharging) are allocated a contractually agreed time window known as **Laytime**. 

When cargo operations exceed this agreed laytime, the charterer must pay compensation to the shipowner known as **Demurrage** (typically ranging from **$15,000 to $65,000+ USD per day**). If operations finish earlier than permitted, the shipowner compensates the charterer via **Despatch** (usually half the demurrage rate).

### Key Industry Pain Points Addressed:
1. **Manual Spreadsheet Vulnerability**: Excel-based laytime sheets frequently suffer from broken formula links, improper prorata sharing among multi-receiver cargo berths, and date math errors.
2. **Contractual Timebar Forfeiture**: Most Charter Parties (BPVOY4, SHELLVOY6, ASBATANKVOY, GENCON) enforce strict 30-day notice and 90-day claim filing timebars. Missing a deadline by even one hour can legally extinguish a six-figure claim.
3. **Operational Discrepancies**: Logged times between ship logs, master statements of facts, and shore terminal logs often conflict on rain delays, mechanical crane breakdowns, shifting, and waiting for berth.
4. **Multi-Berth / Multi-Cargo Allocation**: Complex discharges involving multiple ports, fractional prorata cargo quantities, and simultaneous loading/discharging require rigorous proportional laytime apportionment.
5. **Lack of Audit Trails & Role Governance**: Commercial claims require strict separation of concerns between operational analysts, approving supervisors, external legal auditors, and administrative users.

---

## 3. Core Capabilities Implemented

- **Unified Master Claims Ledger (`/claims`)**: Real-time filtering, multi-column sorting, and TanStack Table management across 32+ commercial and operational parameters.
- **Executive Operations Dashboard (`/dashboard`)**: Instant portfolio intelligence displaying Demurrage Owed, Demurrage Collected, Outstanding Exposure, and Amounts Under Contention.
- **Hierarchical Laytime Calculation Engine (`/calculator`, `/calculations`)**: Pure deterministic mathematical model computing Berth -> Port -> Master Claim totals.
- **Statement of Facts Timeline Engine (`/sof`)**: Granular activity logging with percentage counting, prorata distribution, and category-based allowable deductions.
- **Automated Timebar Compliance Monitor (`/timebar`)**: Dynamic visual countdown tracks contractual deadlines with 4-stage alert thresholds (`Normal`, `Approaching`, `Critical`, `Expired`).
- **Recoverable Adjustment Claims (RAC) Engine (`/rac`)**: Dedicated module for disputed deductions, counterparty contentions, and tariff-based adjustments.
- **Deterministic Discrepancy Detection Engine**: Real-time audit scanner flagging sequence errors (e.g., start time after stop time, missing berths, unlinked ports).
- **Commercial Reporting & PDF Generation (`/reports`)**: Clean PDF claim summaries and dispute filings generated client-side via `jsPDF` and `jspdf-autotable`.
- **Full-Stack Authentication & RBAC**: Secure HTTP-only JWT sessions, bcrypt password hashing, Edge middleware route protection, and 4 dedicated operational roles (`Admin`, `Claim Processor`, `Supervisor`, `Reviewer`).

---

## 4. Distinction Between Business Concepts vs. Implementation Scope

| Industry Concept | Real-World Maritime Standard | Actual Project Implementation |
| :--- | :--- | :--- |
| **Laytime Calculation** | Multi-day laytime calculations governed by clauses (BIMCO, BPVOY4, GENCON). | Implemented via pure TypeScript module (`lib/calculations/laytime.ts`) supporting Berth, Port, and Claim aggregations. |
| **Demurrage Rate** | Negotiated daily charter party rate ($/day) pro-rated to the exact second. | Implemented as `demurrageRatePerDay / (24 * 60)` per-minute granularity in USD. |
| **Despatch** | Despatch on working time saved or all time saved (usually 50% demurrage rate). | Implemented as `timeSavedMinutes * (ratePerMinute / 2)` across berths and claims. |
| **Statement of Facts (SoF)** | Certified document signed by Master, Terminal, and Port Agent. | Implemented as relational `statement_of_facts` records with categories, prorata %, and counted %. |
| **Timebars** | Strict legal exclusion clauses under English or Maritime Arbitration Law. | Implemented via `calculateTimebarCompliance()` with 30-day notice and 90-day claim countdowns. |
| **Vessel AIS / Satellite Tracking** | Live real-time GPS telemetry from satellite providers (MarineTraffic, Spire). | **NOT IMPLEMENTED / PLANNED**: The application uses internal voyage schedules and port records. |
| **Live Port Weather API** | Real-time weather sensor feeds from port meteorological stations. | **SIMULATED / USER-ENTERED**: Weather delays are entered via Statement of Facts activity records. |
| **Automated OCR** | Multi-page deep learning OCR parsing scanned physical port PDFs. | **HYBRID / SIMULATED**: Rule-based document extraction engine (`lib/ocr/processor.ts`) with confidence scoring. |
