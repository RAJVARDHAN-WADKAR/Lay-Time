# Demurrage Claim Management & Laytime Calculation System

A complete, polished, fully-interactive frontend application for maritime Demurrage Claim Management and Laytime Calculation built with Next.js (App Router), React, TypeScript, Tailwind CSS, Recharts, TanStack Table, React Hook Form, and jsPDF.

> **Note**: This is a **frontend-only deliverable powered by typed mock data and local state**. No external backend, database, OCR engine, or live LLM provider is connected. All data operations are cleanly routed through the `@/lib/api/*` abstraction layer so a real backend can be swapped in with zero component rework.

---

## 1. Features Overview

### ⚓ Master Claims Ledger (`/claims`)
- **TanStack Table** with 32+ typed fields covering commercial, operational, date, and financial parameters.
- Multi-column sorting, global search filtering, and pagination (10, 25, 50 rows).
- **Inline Editing**: Quick editing of claim status, agreed amounts, received amounts, and notes directly writing to state.
- **Column Visibility Presets**: Standard View, Financial Focus, Dates & Timebar Focus, and Full Column View.
- **CSV Export**: One-click download of all currently filtered/visible columns and rows.

### 📊 Operations Dashboard (`/dashboard`)
- Dynamic KPI metrics derived in real-time from the claims dataset:
  - Total Demurrage Owed ($)
  - Demurrage Received ($)
  - Total Outstanding Exposure ($)
  - Amount Under Contention ($)
  - Average Processing Time (days)
  - Average Demurrage Per Claim ($)
- **Interactive Recharts Visualizations**:
  - Claim Status Distribution (Donut Chart)
  - Demurrage & Collections Trend (Area Chart)
  - Counterparty Exposure Breakdown (Horizontal Bar Chart)
- Real-time client-side filter controls (Client, Claim Type, Status, Date Range).

### 📝 Multi-Step Claim Creation (`/claims/create`)
- **Step 1 — General Information**: Full Zod schema validation, voyage terms, and timebars.
- **Step 2 — Ports & Berths**: Dynamic repeatable multi-berth allocations with automatic prorata derivation and manual overrides.
- **Step 3 — Statement of Facts**: Preset & custom maritime event logs, duration computing, and deduction categorization.
- **Step 4 — Review & Publish**: Summary verification before publishing to the active ledger.

### 📄 Voyage Documents & Simulated OCR (`/documents`, `/ocr`)
- Drag-and-drop PDF uploader with size/type validation.
- Simulated pipeline status transitions: `Uploaded -> OCR Processing... -> OCR Completed` (or `OCR Failed` for test files).
- Pre-canned messy OCR samples with original vs user-corrected field comparisons and confidence ratings.

### ⚠️ Deterministic Discrepancy Detection Engine
- Pure client-side TypeScript verification engine detecting:
  - Start time after stop time
  - Missing berth or port associations
  - Duplicate operational entries
  - Invalid chronological operational sequence
  - Impossible duration limits (>30 days or <=0)
  - Low OCR confidence ratings (<80%)
- Interactive warning cards with quick "Correct Value" resolution modals.

### 📐 Pure Laytime Calculation Engine (`/calculations`, `lib/calculations/`)
- Decoupled, unit-testable pure TypeScript calculation engine:
  - `Gross Elapsed Time - Allowable Deductions = Net Laytime Used`
  - `Net Laytime Used vs Allowed Laytime = Time Exceeded (Demurrage) / Time Saved (Despatch)`
  - Deduction categories (Weather, Rain, Shifting, Waiting for berth, Breakdown, Strike, etc.)
  - Timebar calculation logic with configurable notice and claim deadlines.
  - Multi-level hierarchy: Berth Summary -> Port Summary -> Claim Master Summary.
  - Interactive manual override capabilities with visual badges.

### 📥 Client-Side PDF Report Generation (`/reports`)
- Downloadable PDF reports generated via `jspdf` & `jspdf-autotable`:
  - **Master Claim Report**: Executive summary, commercial particulars, financial breakdown, and complete SoF log.
  - **Port Operations Report**: Port-by-port laytime reconciliation and pumping rates.
  - **Berth & Deductions Audit**: Detailed weather and breakdown deductions.

### 🤖 Grounded AI Claim Assistant (`/ai-assistant`)
- Conversational chat interface grounded in the active claims and calculations state.
- Pattern-matched query parsing with source-citation lines.
- Deterministic fallback: *"Insufficient information available in the provided claim documents."*

### 👥 Role-Based Access Control (Mock Switcher)
- Lightweight presentation-layer role switcher in top header:
  - **Admin**: Full access + User Management screen (`/users`).
  - **Supervisor**: Full editing access across all claims.
  - **Claim Processor**: Only permitted to edit claims assigned to them.
  - **Reviewer**: Read-only mode across all ledger and calculation views.

---

## 2. Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Table**: TanStack Table v8
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **PDF Export**: jsPDF + jsPDF-AutoTable

---

## 3. Project Architecture & Backend Seam

All data operations are centralized in `lib/api/*` with simulated async network latency.

```
app/
  dashboard/          # Operations metrics & Recharts
  claims/             # TanStack Table Claims Ledger
  claims/[id]/        # Tabbed Claim Detail view
  claims/create/      # 4-Step Claim Creation Wizard
  documents/          # Upload & OCR Pipeline
  ocr/                # SoF Review & Discrepancy Hub
  calculations/       # Pure Laytime Calculation Engine
  reports/            # Client-Side PDF Generator
  ai-assistant/       # Grounded Mock AI Assistant
  users/              # Admin-Only User Management
  settings/           # Assumptions & Business Rules
components/
  ui/                 # Design tokens (Badge, Button, Card, Modal, Inputs)
  layout/             # Sidebar, Header, RoleSwitcher, DemoBadge
  claims/             # Step forms, Overview tab, SoF tab, Ports tab
lib/
  api/                # Centralized Backend Seam (Async mock CRUD)
  calculations/       # Pure unit-testable laytime, deduction & timebar functions
  context/            # AuthContext & Role Switcher
  mock/               # Seed dataset, Aggregator, AI Grounding
  types/              # Comprehensive TypeScript interfaces
  utils/              # Formatters, CSV exporter, PDF generator, cn merger
```

---

## 4. Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```
