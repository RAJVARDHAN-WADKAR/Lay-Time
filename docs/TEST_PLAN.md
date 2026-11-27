# Maritime Laytime & Demurrage — End-to-End Verification Test Plan

**Scope:** Clean-database build & verification across all 5 user roles (`ADMIN`, `SUPERVISOR`, `CLAIM_PROCESSOR`, `REVIEWER`, `CLIENT`) covering access control, navigation, real OCR extraction, laytime day rules & holidays, timebar compliance, overlapping SoF resolution, upload bounds/magic bytes, date rules, and API security hardening.

---

## Preconditions & Clean Environment Setup
1. Remove any existing SQLite DB files (`data/laytime.db*`) and old uploaded binaries (`data/uploads/*`).
2. Start server cleanly with `npm run build && npm start` and allow auto-seed (`seedDatabase` + `seedBenchmarkDataset` + `seedDefaultHolidays` + `LaytimeServicesTracker.csv`) and `node scripts/seed-users.js`.
3. Verify offline OCR fixtures exist under `tests/fixtures/ocr/`:
   - `sof-text-layer.pdf` (>= 15 KB text-layer PDF SoF)
   - `antwerp_bad.pdf` (byte-identical PDF under misleading filename)
   - `sof-alt-dates.pdf` (text-layer PDF using `dd-MMM-yyyy` & `dd.mm.yy` dates)
   - `sof-scanned.png` (scanned image PNG SoF)
   - `sof-skewed-low.png` (skewed low-contrast scan PNG)
   - `sof-blank.pdf` (valid header, blank canvas)
   - `sof-corrupt.pdf` (garbage/corrupted payload)
   - Oversized (>1 MB) and undersized (<15 KB) negative test files

---

## Role-by-Role Walkthrough Matrix

### 1. ADMIN (`admin@laytime.demo`)
1. Log in and verify landing on `/dashboard/admin` with single active sidebar item.
2. Navigate bottom-to-top and top-to-bottom across every sidebar item (`/users`, `/settings`, `/notifications`, `/reports`, `/analytics`, `/timebar`, `/rac`, `/ocr`, `/documents`, `/calculations`, `/calculator`, `/claims/create`, `/claims`, `/dashboard/admin`). Verify zero bounce to dashboard and exact single active nav state.
3. Reload (F5), use browser Back/Forward, and apply Ledger filters -> verify URL query preservation and F5 persistence.
4. Open `/settings`: configure Laytime defaults (`weekendRule`, `defaultNoticeTimebarDays = 30`, `defaultClaimTimebarDays = 90`), open Holiday Calendar section -> add & delete a test holiday.
5. Verify Holiday API CRUD + `date-holidays` seeding for `AE` / `NL` / `SG`.
6. Create a new claim (`/claims/create`) -> verify sequential `DBLS...` Claim ID & persistence across reload.
7. Trigger manual Refresh -> toast notification; inject a mocked 500 error route -> `<DataErrorBanner>` shows Retry button and recovers cleanly.

### 2. SUPERVISOR (`supervisor@laytime.demo`)
1. Log in and verify landing on `/dashboard/supervisor`.
2. Navigate every allowed sidebar item top-to-bottom and bottom-to-top without bounces.
3. Verify `/users` and `/settings` are NOT in sidebar and direct navigation shows `/no-access` (`403`, no dashboard redirect) with working Back button.
4. Upload real fixtures on `/documents` (`sof-text-layer.pdf`, `sof-scanned.png`, `sof-skewed-low.png`) against a claim; confirm `<15 KB` (400) and `>1 MB` (413) rejections both in UI and API.
5. Open `/ocr`, run real extraction on `sof-text-layer.pdf` and `sof-scanned.png`; inspect Draft side-by-side view (`Original Raw Text` vs editable parsed events); verify filename (`antwerp_bad.pdf`) does not alter extraction; confirm `<80%` low-confidence raises `low_confidence` discrepancy.
6. Edit one parsed timestamp in the OCR draft and click **Confirm & Save to SoF** -> verify `statement_of_facts` rows persist and edit is audit-logged.
7. Open `CLM-0006` (seeded overlapping events on Berth 4): confirm red overlap highlight + visual red bar + One-Click Fix Overlap dialog -> resolve or switch overlapPolicy between `block` and `exception_wins`.
8. Open `CLM-0001` Calculations tab: calculate under `SHEX`, switch Day Rule selector to `FHEX`, verify recalculation & Per-Day Breakdown table & Export PDF.
9. Open `/timebar`: confirm `30d`/`90d` defaults, `"Imported value differs from default"` badge on imported `45d` Sokana3 claims, and unsubmitted claims are not prematurely marked Urgent/Timebarred.

### 3. CLAIM_PROCESSOR (`processor1@laytime.demo`)
1. Log in and verify landing on `/dashboard/claim-processor`.
2. Verify **Assigned Claims** (`/claims/assigned`) shows ONLY assigned claims and is uniquely highlighted (not `"All Claims"` or `"Create Claim"`).
3. Navigate all allowed sidebar items in reverse order; confirm `/analytics`, `/reports`, `/users`, `/settings` are hidden and return 403/no-access directly.
4. Create a new claim -> auto-assigned to self (`DBLS...`). Confirm future-dated milestones are blocked.
5. Edit SoF, upload document, run OCR on assigned claim (`200`), attempt OCR on an unassigned claim (`403 Forbidden`).

### 4. REVIEWER (`reviewer@laytime.demo`)
1. Log in and verify landing on `/dashboard/reviewer`.
2. Verify read-only UI: Create Claim, Upload, Edit SoF, OCR Run, Override, Users, Settings are hidden.
3. Navigate Ledger, Claim Details, Calculations, Timebar, RAC, Reports; verify download document works (`200`) while `POST /api/claims`, `POST /api/ocr`, `POST /api/documents` return `403 Forbidden`.
4. Confirm direct `/claims/create` and `/ocr` show "You don't have access to this page" (`403`).

### 5. CLIENT (`client1@laytime.demo`)
1. Log in and verify landing on `/dashboard/client`.
2. Verify strict client-company claim & document isolation: only own client's claims (`Trafigura Trading Pte Ltd`) visible; accessing another client's claim/document returns `403`/`404`.
3. Verify `/claims/create`, `/ocr`, `/analytics`, `/reports`, `/users`, `/settings` are hidden and blocked (`403`).

---

## Pass Execution Log Requirements
Record three consecutive verification passes against the built `npm start` server after final edits:
- **Pass 1:** Full automated Unit + API + Security + RBAC + DB + OCR + Day-Rules + Timebar + Overlap + Upload + Date-Rule + Concurrency test run.
- **Pass 2:** Headless Browser (Playwright) E2E suite across all 5 roles covering nav, F5/Back/Forward, Error Banner + Retry, Upload bounds, real OCR draft edit + Confirm, Overlap highlighting, SHEX->FHEX calculation, and Timebar badges.
- **Pass 3:** Full Role-by-Role Walkthrough execution per this Test Plan against clean DB with real sample documents, recording Pass/Fail for every role & flow.
