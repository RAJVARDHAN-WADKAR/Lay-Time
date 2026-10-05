# Data Sources and Data Provenance

## 1. Data Classification Taxonomy

Every data point within the application is classified into one of the following distinct source categories:

| Source Category | Code / Storage Implementation | Classification Label |
| :--- | :--- | :--- |
| **A. User-Entered Data** | Manual forms in UI wizard (`/claims/create`, `/claims/:id`, `/users`) | `USER-PROVIDED DATA` |
| **B. Database Data** | File-backed relational SQLite tables in `data/laytime.db` | `DATABASE PERSISTED` |
| **C. Static / Mock / Sample Data** | Pre-canned maritime seed records in `lib/mock/data.ts` | `DEMO / SAMPLE DATA` |
| **D. Uploaded Documents** | Drag-and-drop file inputs on `/documents` and `/ocr` | `USER-UPLOADED FILE` |
| **E. OCR-Extracted Data** | Rule-based document extraction in `lib/ocr/processor.ts` | `OCR SIMULATED EXTRACTION` |
| **F. External Live API** | Live shipping APIs (MarineTraffic, AIS, Port Authority) | `NOT CONNECTED / NONE` |
| **G. Third-Party Cloud Service**| External cloud storage (AWS S3, Azure Blob) | `NOT CONNECTED / LOCAL ONLY` |
| **H. Calculated / Derived Data** | Pure mathematical functions in `lib/calculations/*` | `SYSTEM CALCULATED` |
| **I. AI-Generated Data** | Local simulated responses in `lib/mock/assistant.ts` | `SIMULATED AI RESPONSE` |

> [!IMPORTANT]
> **NO REAL-TIME SHIPPING TELEMETRY OR LIVE PORT SENSORS ARE CONNECTED**: The application does **not** pull live AIS vessel tracking, real-time satellite GPS, or live meteorological radar data from external APIs. All initial voyage records originate from the curated **12 synthetic maritime claim datasets** in `lib/mock/data.ts` or from manual user data entry.

---

## 2. Field-by-Field Data Provenance Tracing

### 1. Vessel Name (`shipName`)
- **Source**: `USER-PROVIDED DATA` (via `/claims/create` Step 1) OR `DEMO / SAMPLE DATA` (initial seed).
- **Transformation**: Trimmed string, sanitized for SQL injection prevention.
- **Validation**: Required string, min 2 characters (Zod schema in `components/claims/Step1General.tsx`).
- **Storage**: Stored in `claims.ship_name` in `data/laytime.db`.
- **Calculation**: Used as label key in charts and discrepancy detection.
- **Final Usage**: Displayed on `/claims` ledger, `/dashboard` tables, and header of PDF reports.

### 2. Daily Demurrage Rate (`demurrageRatePerDay`)
- **Source**: `USER-PROVIDED DATA` from Charter Party contract terms (e.g. $32,000/day).
- **Transformation**: Cast from numeric string to floating-point number.
- **Validation**: `z.number().positive("Demurrage rate must be greater than 0")`.
- **Storage**: Stored in `claims.demurrage_rate_per_day` (REAL).
- **Calculation**: Converted to rate-per-minute: `demurrageRatePerDay / (24 * 60)`.
- **Final Usage**: Multiplied by `timeExceededMinutes` to derive `demurrageAmount`.

### 3. Cargo Quantity & Load Rate (`quantity`, `loadRate`)
- **Source**: `USER-PROVIDED DATA` (via `/claims/create` Step 2 - Ports & Berths).
- **Transformation**: Float numbers in Metric Tons (MT) and MT/Day.
- **Validation**: Quantity > 0, Load Rate > 0.
- **Storage**: Stored in `berths.quantity` and `berths.load_rate`.
- **Calculation**: Computes `allowedLaytimeMinutes = Math.round((quantity / loadRate) * 1440)`.
- **Final Usage**: Defines the baseline contractual threshold before demurrage begins.

### 4. Statement of Facts Timestamps (`startTime`, `stopTime`)
- **Source**: `USER-PROVIDED DATA` entered in `/claims/:id` SoF tab OR `OCR SIMULATED EXTRACTION` from `/ocr`.
- **Transformation**: ISO 8601 string formatting (`YYYY-MM-DDTHH:mm:ssZ`).
- **Validation**: `detectDiscrepancies()` verifies that `stopTime > startTime` and neither value is `NaN`.
- **Storage**: Stored in `statement_of_facts.start_time` and `stop_time`.
- **Calculation**: `calculateGrossMinutes()` derives `grossMinutes = (stop - start) / 60000`.
- **Final Usage**: Forms the raw elapsed time consumed by operations.

### 5. Allowable Deductions (`percentageCounted`, `prorata`)
- **Source**: `USER-PROVIDED DATA` selected based on Charter Party exception clauses.
- **Transformation**: Percentage clamped between 0 and 100.
- **Validation**: `Math.min(Math.max(val, 0), 100)`.
- **Storage**: Stored in `statement_of_facts.percentage_counted` and `prorata`.
- **Calculation**: `effectivePercentage = (percentageCounted * prorata) / 10000`; `netUsed = gross * effectivePercentage`.
- **Final Usage**: Non-counted minutes (`gross - netUsed`) are deducted from laytime.

### 6. Timebar Compliance Flags (`timebarred`, `noticeDaysRemaining`)
- **Source**: `SYSTEM CALCULATED` derived from contract dates.
- **Transformation**: Epoch millisecond differences converted to integer days.
- **Validation**: Null-checked against `voyageEndDate` and current date.
- **Storage**: Stored in `claims.timebarred` and dynamic JSON in `laytime_calculations`.
- **Calculation**: Evaluates whether `noticeReceivedDate <= voyageEndDate + 30d` and `claimReceivedDate <= voyageEndDate + 90d`.
- **Final Usage**: Renders green/amber/red countdown badges on `/timebar` and blocks disputed payouts.

---

## 3. Seed Dataset Reference

The pre-loaded baseline dataset consists of **12 synthetic maritime claim scenarios** reflecting authentic commercial voyage conditions:

| Claim Reference | Vessel Name | Charter Party Form | Cargo Type | Demurrage Rate ($/day) | Purpose of Dataset Item |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CLM-2024-001` | MV Ocean Titan | BPVOY4 | Crude Oil | $32,000 | Multi-deduction crude oil tanker discharge at Rotterdam |
| `CLM-2024-002` | MV Nordic Voyager | SHELLVOY6 | Clean Petroleum | $28,500 | Multi-berth discharge with prorata parcel allocation |
| `CLM-2024-003` | MT Pacific Glory | ASBATANKVOY | Chemicals | $24,000 | US Gulf loading with notice timebar near expiry |
| `CLM-2024-004` | MV Baltic Trader | GENCON 94 | Grain | $18,000 | OCR low-confidence test case with messy scan artifacts |
| `CLM-2024-005` | MT Aegean Horizon | BPVOY4 | Crude Oil | $35,000 | Ras Tanura loading under contention |
| `CLM-2024-006` | MV Starlight Ace | BIMCO Standard | Coal | $22,000 | Dry bulk loading with weather rain interruptions |
| `CLM-2024-007` | MT Golden Dynamic | ASBATANKVOY | Fuel Oil | $30,000 | Offshore Ship-to-Ship (STS) transfer scenario |
| `CLM-2024-008` | MV Poseidon Leader | GENCON 94 | Raw Sugar | $19,500 | Brazilian port congestion with berth waiting deductions |
| `CLM-2024-009` | MT Atlas Star | NYPE 93 | Iron Ore | $26,000 | Despatch scenario (operations completed early) |
| `CLM-2024-010` | MV Gulf Pioneer | BPVOY4 | Condensate | $31,000 | US Gulf export with pump warranty discrepancy |
| `CLM-2024-011` | MV Atlantic Crown | GENCON 94 | Fertilizer | $16,500 | Hamburg discharge with shore equipment breakdown |
| `CLM-2024-012` | MT Arctic Mariner | SHELLVOY6 | Condensate | $34,000 | North Sea cold weather loading with contractual grace period |
