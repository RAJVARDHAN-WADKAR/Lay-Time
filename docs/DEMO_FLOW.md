# 5–10 Minute Live Viva Demonstration Flow

**Project:** Lay-Time / Demurrage Claim Management System  
**Audience:** Academic Examiners, Industry Evaluators, Maritime Chartering Specialists, Technical Auditors  
**Live URL:** `http://localhost:3000` (Production Build running via Next.js standalone runtime)  
**Database:** `data/laytime.db` (SQLite 3.45 with Write-Ahead Logging `PRAGMA journal_mode=WAL`)  

---

## 1. Demonstration Strategy & Time Allocation

| Phase | Duration | Objective | Key Screen / Route | Role Used |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | 1.0 min | Introduction & Project Problem Statement | `/login` | N/A (Unauthenticated) |
| **Stage 2** | 1.5 min | Authentication, Edge RBAC & Security | `/login` → `/dashboard` | `Admin` & `Reviewer` |
| **Stage 3** | 1.5 min | Executive Dashboard & Financial Exposure KPIs | `/dashboard` | `Admin` |
| **Stage 4** | 2.0 min | Claims Lifecycle & Calculation Engine | `/claims` → `/claims/CLM-2024-001` | `Claim Processor` |
| **Stage 5** | 1.5 min | Specialized Modules: RAC & Timebar Monitor | `/rac` & `/timebar` | `Supervisor` |
| **Stage 6** | 1.0 min | Reports, Audit Trail & PDF Generation | `/reports` | `Supervisor` |
| **Stage 7** | 1.0 min | RBAC Negative Testing & Administration | `/users` | `Reviewer` vs `Admin` |
| **Total** | **9.5 min** | **Comprehensive Full-System Audit & Defense** | — | — |

---

## 2. Step-by-Step Viva Execution Script

### Stage 1: Introduction & Problem Context (1.0 Minute)
* **Action:** Open browser to `http://localhost:3000/dashboard` directly while logged out.
* **Observed System Behavior:** 
  - Next.js Edge Middleware intercepts the request.
  - No valid `auth_token` JWT cookie is found.
  - The browser is immediately redirected to `http://localhost:3000/login?from=%2Fdashboard`.
  - HTTP response header `Cache-Control: no-store, no-cache, must-revalidate` prevents browser backward caching.
* **Viva Talking Points:**
  > *"Laytime disputes cost the maritime bulk liquid and dry cargo shipping industries over $3 billion annually in commercial leakage. In traditional operations, post-fixture claims managers manually cross-examine 50-page Statements of Facts (SOF), charter party rider clauses, and pumping logs across spreadsheets. This manual workflow leads to missed 30/90-day timebars, calculation human error, and delayed recovery.*
  > 
  > *This system automates statement parsing, applies strict charter party exception rules (SHINC/SHEEX, rain, strikes, shifting), computes demurrage/despatch down to the second, tracks strict legal timebars, and executes multi-port RAC (Reversible / Average / Cumulative) laytime pooling."*

---

### Stage 2: Authentication & Edge RBAC Verification (1.5 Minutes)
* **Action 1 (Invalid Credentials Test):**
  - Enter `admin@invalid.com` and `WrongPassword@999`. Click **Sign In**.
  - **Result:** System displays red banner: *"Invalid email or password"*. HTTP status 401. Passwords are never revealed in network responses or DOM.
* **Action 2 (Admin Login):**
  - Click the quick-fill button: `Admin (rajvardhanwadkar76@gmail.com)`.
  - Toggle the password visibility eye icon to reveal `Raj@123`.
  - Click **Sign In**.
* **Observed System Behavior:**
  - POST `/api/auth/login` verifies bcrypt hash in `data/laytime.db`.
  - Server sets `HttpOnly`, `SameSite=Lax`, `Path=/` session cookie containing signed JWT (HS256).
  - Redirects smoothly to `/dashboard`.
  - Header profile indicator displays: `Rajvardhan Wadkar` with purple `Admin` badge.
* **Viva Talking Points:**
  > *"Authentication is powered by bcrypt (10 salt rounds) and HMAC-SHA256 JWT tokens verified at the Edge using the Web Crypto API (`crypto.subtle`). Passwords never touch the client DOM, localStorage, or application state. The session is strictly managed via HttpOnly cookies."*

---

### Stage 3: Executive Dashboard & Exposure KPIs (1.5 Minutes)
* **Route:** `http://localhost:3000/dashboard`
* **Features to Highlight:**
  1. **Top Metric Cards:**
     - **Active Claims Ledger:** 12 total synthetic commercial claims ($1,842,500 gross exposure).
     - **Pending RAC Settlement:** $145,200 pending inter-port offset balance.
     - **Critical Timebars:** 2 claims within 7 days of commercial extinction.
     - **Demurrage Claimed vs Incurred:** Real-time ledger variance.
  2. **Active Voyage Distribution:** Vessel status, port of loading/discharge, charterer exposure (Shell, BP, Trafigura, Vitol).
  3. **Visual Pipelines:** Recharts interactive bar chart showing Demurrage vs Despatch by Charterer and Timebar Countdown Radar.
* **Viva Talking Points:**
  > *"The executive dashboard consolidates multi-vessel voyage operations into actionable financial exposure metrics. It instantly flags charterers with high dispute frequencies and highlights timebars requiring immediate documentary dispatch to prevent legal forfeiture under English High Court precedents."*

---

### Stage 4: Claims Ledger & Calculation Engine (2.0 Minutes)
* **Route:** Navigate to `/claims` from the sidebar navigation.
* **Action 1 (Search & Filter):**
  - Filter by Charterer: Select `Shell International`.
  - Filter by Status: Select `Disputed`.
  - Search: Type `Ocean Titan`.
  - **Result:** Instant TanStack table filtering highlighting Claim `CLM-2024-001` (MT Ocean Titan).
* **Action 2 (Deep Dive into Claim `CLM-2024-001`):**
  - Click on `CLM-2024-001` to enter the detail calculation view.
  - Review **Voyage Data**: Ras Tanura to Rotterdam, 120,000 MT Crude Oil, Charter Party Shellvoy 6, Laytime Allowed: 72h 00m SHINC, Demurrage Rate: $35,000/day.
  - Review **SOF Event Timeline (Discrepancy Hub)**:
    - NOR Tendered: 2024-01-10 06:00
    - Notice Period: 6 hours (commenced 2024-01-10 12:00)
    - Rain Exception: 2024-01-11 14:00 to 18:00 (4.0 hrs deducted under Shellvoy 6 cl. 15)
    - Boiler breakdown (Ship breakdown): 6.0 hrs deducted 100% against Owner
    - Shifting from anchorage to berth: 2.5 hrs excluded
  - Review **Calculated Output**:
    - Total Time Used: 114h 30m
    - Deductions / Exceptions: 12h 30m
    - Net Laytime Used: 102h 00m
    - Allowed Laytime: 72h 00m
    - **Excess Laytime (Demurrage Time):** 30h 00m (1.250000 days)
    - **Demurrage Amount:** $1.250000 \times \$35,000 = \$43,750.00$
* **Viva Talking Points:**
  > *"Here is the core calculation engine in action. Notice that laytime calculation is exact to the minute and rounded to 6 decimal day fractions. Deductions adhere to charter party terms: rain is excluded under standard weather-working clauses, while mechanical vessel breakdowns are fully deducted from laytime. Once allowed laytime expires, the ancient maritime maxim 'Once on demurrage, always on demurrage' activates unless express rider exceptions apply."*

---

### Stage 5: Specialized Modules: RAC & Timebar Monitor (1.5 Minutes)
* **Step 1: Reversible Laytime / RAC (`/rac`)**
  - Navigate to `/rac`.
  - Explain the 3 pooling modes: **Reversible**, **Average**, and **Cumulative (RAC)**.
  - Demonstrate Port Pooling:
    - Port of Loading (Ras Tanura): Despatch earned = $12,500 (Finished 10 hours early).
    - Port of Discharge (Rotterdam): Demurrage incurred = $43,750 (Finished 30 hours late).
    - **Net Combined Offset:** $\$43,750 - \$12,500 = \$31,250.00$ owner net claim.
  - Highlight the 6-state RAC workflow badge: `DRAFT → PENDING_REVIEW → DISPUTED → RECONCILED → APPROVED → SETTLED`.
* **Step 2: Timebar Risk Monitor (`/timebar`)**
  - Navigate to `/timebar`.
  - Highlight the 4 alarm thresholds:
    - 🟢 Normal (> 30 days remaining)
    - 🟡 Warning (15–30 days remaining)
    - 🟠 Urgent (8–14 days remaining)
    - 🔴 Critical (0–7 days remaining)
    - ⚫ Timebarred (Expired - Complete Claim Extinguishment)
  - Inspect Claim `CLM-2024-004` (MT Baltic Breeze): 4 days remaining before 90-day timebar expiry under BPVOY 4 clause 20.
  - Document checklist verification: NOR, SOF, Pumping Log, Invoices, Protest Letters.
* **Viva Talking Points:**
  > *"Under English High Court rulings (such as The 'Mira N' and The 'Sabrewing'), failure to present supporting documents within the strict charter party timebar period (typically 30 or 90 days from hose disconnection) completely extinguishes the Owner's commercial right to claim demurrage. Our Timebar Monitor proactively alerts claims processors before high-value rights are permanently lost."*

---

### Stage 6: Reports & Export Capabilities (1.0 Minute)
* **Route:** Navigate to `/reports`
* **Actions:**
  - Select Report Type: **Executive Laytime & Demurrage Summary**.
  - Date Range: Last 90 Days.
  - Filter: All Charterers.
  - Click **Generate Summary Report**.
  - Click **Export PDF / Print View**.
* **Observed System Behavior:**
  - Dynamic client-side report compilation with formatted executive summary, vessel breakdown table, and financial exposure totals.
  - Clean printable media stylesheet (`@media print`) and PDF download support.
* **Viva Talking Points:**
  > *"Reports are generated directly from client-side analytical aggregates, providing instant PDF exports for chartering meetings and commercial negotiations without requiring heavy external cloud reporting services."*

---

### Stage 7: RBAC Negative Testing & Administration (1.0 Minute)
* **Action 1 (Logout as Admin):**
  - Click the **Sign Out** button in the header/sidebar.
  - System calls POST `/api/auth/logout`, clears the HTTP-only cookie, and redirects to `/login`.
* **Action 2 (Login as Reviewer):**
  - Click quick-fill: `Reviewer (paraschougale558@gmail.com)` / `Paras@123`.
  - Click **Sign In**.
  - Profile header now shows: `Paras Chougale` with green `Reviewer` badge.
* **Action 3 (Reviewer Negative Enforcement Test):**
  - Direct browser to restricted URL: `http://localhost:3000/users`.
  - **Result:** Edge middleware or client RBAC guard blocks access! Displays **"Access Restricted — Administrator privileges required to access User Management"**.
  - Navigate to `/claims/CLM-2024-001`.
  - **Result:** Edit buttons and status change dropdowns are disabled or hidden; banner confirms: *"Read-Only Mode: You have read-only privileges. Contact an Administrator to modify claim details."*
* **Action 4 (Admin Access Test):**
  - Logout and log back in as `Admin`.
  - Navigate to `/users`.
  - Full user management table appears: displays user IDs, email, roles, active status toggles, and creation timestamps.
* **Viva Talking Points:**
  > *"Our security is enforced at two distinct layers: first at the network Edge via Next.js Middleware before pages or APIs execute, and second within the React context via fine-grained permission flags (`canEditClaim`, `canAccessUsers`, `isReadOnly`). Even if a malicious user manually alters frontend state or crafts URL routes, the backend APIs reject unauthorized POST/PUT/DELETE requests."*

---

## 3. Anticipated Viva Examiner Challenges & Authoritative Answers

| Question | Examiner's Focus | Your Immediate Confident Defense |
| :--- | :--- | :--- |
| **"Where is the actual calculation code located?"** | Verification of real math vs mock numbers | *"All maritime calculation formulas are strictly coded in [lib/calculations/laytime.ts](file:///C:/Lay%20time/lib/calculations/laytime.ts) and [lib/calculations/rac.ts](file:///C:/Lay%20time/lib/calculations/rac.ts). It converts ISO 8601 timestamps to millisecond precision, handles minute/day conversions, deductions, and demurrage multiplication."* |
| **"Is this connected to real AIS satellite vessel tracking?"** | Authenticity of live external data | *"No. As documented in our Data Sources Taxonomy, vessel positions and initial SOF events are derived from 12 synthetic commercial claim fixtures in `lib/mock/data.ts`. No paid AIS or port radar subscriptions are used."* |
| **"How is database persistence handled?"** | Data integrity & architecture | *"We utilize an embedded SQLite 3.45 database located at `data/laytime.db` configured with Write-Ahead Logging (`WAL`). For rapid client UI response, the frontend mirrors state in `localStorage` via `clientStore.ts`."* |
| **"How are passwords protected against leaks?"** | Security standards | *"Passwords are never stored in plaintext. They are salted and hashed using `bcrypt` (10 rounds). The JWT session cookie is marked `HttpOnly`, preventing Cross-Site Scripting (XSS) extraction."* |
| **"What happens if allowed laytime is exceeded by 1 minute?"** | Maritime chartering law | *"Under the 'once on demurrage, always on demurrage' doctrine, demurrage runs continuously 24/7 without weather or weekend exceptions unless an express charter party rider clause states otherwise."* |

---

## 4. Emergency Backup Checklist for Live Presentation

1. **Verify Server is Running:**
   ```powershell
   Get-Process -Name "node"
   # Verify port 3000 is listening
   Test-NetConnection -ComputerName 127.0.0.1 -Port 3000
   ```
2. **Re-seed Accounts if Database was reset:**
   ```powershell
   node scripts/seed-users.js
   ```
3. **Run Automated Test Suite to Prove 100% Pass Rate:**
   ```powershell
   npm run test:auth
   # Confirms 44/44 automated verification checks pass
   ```
