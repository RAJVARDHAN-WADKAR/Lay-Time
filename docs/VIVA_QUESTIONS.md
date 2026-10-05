# Viva & Examination Preparation: Comprehensive Q&A Guide

This guide provides precise, authoritative answers to the 26 core technical and domain viva questions based strictly on the actual system implementation.

---

### Q1: What is your project?
**Answer**: Our project is an enterprise-grade **Lay-Time and Demurrage Claim Management System** built on Next.js 14, TypeScript, Tailwind CSS, and SQLite. It automates commercial post-fixture operations in maritime shipping by parsing voyage Statement of Facts, calculating contractual laytime, identifying demurrage and despatch amounts, auditing contractual timebars, detecting operational sequence discrepancies, and managing contentious claims through Recoverable Adjustment Claim (RAC) workflows.

---

### Q2: What real-world problem does it solve?
**Answer**: In global ocean trade, charterers and shipowners lose millions of dollars due to manual spreadsheet errors, overlooked contractual timebar deadlines (which legally extinguish claims if missed), conflicting timesheets between ship and shore, and complex multi-berth cargo prorata apportionment. Our system automates these mathematical evaluations, provides real-time timebar compliance alerts, and enforces cryptographic role-based audit governance.

---

### Q3: Why did you choose this problem?
**Answer**: Maritime shipping carries over 80% of global trade. Demurrage claims average between $15,000 to $65,000+ per day per vessel. Despite these high financial stakes, most shipping desks still process multi-hundred-thousand-dollar claims using fragile Excel sheets. Digitizing this workflow with deterministic validation algorithms presents high commercial and technical value.

---

### Q4: Who are the users?
**Answer**: The system serves four distinct organizational roles:
1. **Admin**: Manages user accounts, system parameters, and has full portfolio access.
2. **Claim Processor**: Enters voyage particulars, logs Statement of Facts events, and handles assigned claims.
3. **Supervisor**: Reviews calculations across all portfolios, authorizes overrides, and approves final settlements.
4. **Reviewer**: Legal counsel or external auditors who inspect claims and audits in strictly read-only mode.

---

### Q5: What technologies did you use?
**Answer**: 
- **Frontend & App Framework**: Next.js 14.2 (App Router), React 18, TypeScript 5.6.
- **Styling & UI**: Tailwind CSS 3.4, Lucide React icons.
- **Data Tables & Visuals**: TanStack Table v8, Recharts.
- **Reporting**: jsPDF and jspdf-autotable for client-side PDF document generation.
- **Database & Persistence**: SQLite3 via `better-sqlite3` with Write-Ahead Logging (WAL mode).
- **Security**: `bcryptjs` (10 rounds password hashing), `jsonwebtoken`, native Web Crypto API (`crypto.subtle`) in Edge Middleware.
- **Validation**: Zod schema validation and React Hook Form.

---

### Q6: Why did you choose Next.js?
**Answer**: Next.js 14 App Router allows us to build a unified full-stack application. It provides Edge Middleware for instant route protection and JWT verification before rendering, Server-Side API Route Handlers for database queries, and fast client-side navigation without needing separate deployment repositories for backend and frontend.

---

### Q7: Why TypeScript?
**Answer**: Demurrage calculations involve strict date-time mathematics, financial rates, and nested hierarchies (Berths -> Ports -> Claims). TypeScript's static typing catches null reference bugs, enforces domain interfaces (`Claim`, `Port`, `SoFActivity`), and guarantees contract safety across the calculation engines.

---

### Q8: Why Tailwind CSS?
**Answer**: Tailwind CSS provides utility-first responsive styling with zero CSS bloat. It enabled us to create a polished, bespoke maritime interface (`#0B192C` navy blue theme) with consistent typography, custom badges, and responsive tables without writing thousands of lines of fragile custom CSS.

---

### Q9: Why TanStack Table?
**Answer**: TanStack Table is a headless table engine. It handles multi-column sorting, column-level search filtering, column visibility toggles (Financial View, Timebar View, Full View), and pagination across 32+ claim parameters without locking us into rigid, hard-to-style pre-built table widgets.

---

### Q10: Why Recharts?
**Answer**: Recharts is a declarative charting library built for React. It renders responsive SVG charts (Donut charts for claim status distributions, Area charts for financial collections, and Horizontal Bar charts for counterparty exposure) that seamlessly integrate with our state and dynamic client-side filters.

---

### Q11: Why jsPDF?
**Answer**: jsPDF paired with `jspdf-autotable` compiles vector PDF documents entirely within the user's web browser. This means commercial Demurrage Claim Calculation Reports can be generated and downloaded in less than 500 milliseconds with zero server rendering overhead or external PDF API subscription costs.

---

### Q12: How does authentication work?
**Answer**: 
1. The user enters their email and password on `/login`.
2. The server endpoint `POST /api/auth/login` verifies the email format and compares the submitted password against the `bcrypt` hash stored in the SQLite `users` table.
3. Upon verification, the server signs a 7-day JWT containing the user ID, email, name, and role.
4. The JWT is transmitted as a secure `HttpOnly`, `SameSite=Lax` cookie (`laytime_auth_token`).
5. Client-side JavaScript cannot read the token, protecting against XSS attacks.

---

### Q13: How does role-based access work?
**Answer**: Role-based access control is enforced at two distinct levels:
1. **Edge Middleware (`middleware.ts`)**: Verifies the JWT signature using native Web Crypto (`crypto.subtle`). If an unauthenticated user visits a protected page, it redirects to `/login`. If a non-Admin attempts to visit `/users`, it redirects to `/dashboard`.
2. **Server API Handlers (`app/api/*`)**: Every mutating API route checks the user's role. For example, Reviewers are barred (`403 Forbidden`) from modifying claims, and Processors can only edit claims assigned to their account.

---

### Q14: How is data stored?
**Answer**: Data is persisted in a local relational SQLite database at `data/laytime.db` structured across 20 relational tables (including `users`, `claims`, `ports`, `berths`, `statement_of_facts`, `deductions`, `discrepancies`, and `rac_cases`). Foreign keys are enforced (`PRAGMA foreign_keys = ON;`), and Write-Ahead Logging (`WAL`) is enabled for concurrent read performance.

---

### Q15: Where does the data come from?
**Answer**: 
- The initial system is seeded with **12 synthetic maritime claim scenarios** (`lib/mock/data.ts`) representing real-world commercial voyages under BPVOY4, SHELLVOY6, ASBATANKVOY, and GENCON terms.
- New operational data is entered manually by users via the multi-step claim creation wizard and Statement of Facts entry forms.
- The project does **not** connect to live AIS vessel satellite feeds or external port radar APIs; all milestones are stored in the database.

---

### Q16: How is laytime calculated?
**Answer**:
1. **Allowed Laytime**: $\text{Quantity} / \text{Load Rate} \times 1440 \text{ minutes}$.
2. **Gross Elapsed Time**: Elapsed duration between event start and stop timestamps: $(T_{\text{stop}} - T_{\text{start}}) / 60000$.
3. **Allowable Deductions**: For each Statement of Facts activity, $\text{Counted Time} = \text{Gross Time} \times (\% \text{ Counted} / 100) \times (\text{Prorata} / 100)$. Deductions are: $\text{Gross} - \text{Counted}$.
4. **Net Laytime Used**: Sum of counted minutes across all activities.

---

### Q17: How is demurrage calculated?
**Answer**:
1. **Time Exceeded**: $\max(0, \text{Net Laytime Used} - \text{Allowed Laytime})$.
2. **Rate per Minute**: $\text{Contract Daily Demurrage Rate} / 1440$.
3. **Demurrage Amount**: $\text{Time Exceeded Minutes} \times \text{Rate per Minute}$.
4. **Despatch (if completed early)**: $\text{Time Saved Minutes} \times (\text{Rate per Minute} / 2)$.
5. **Final Claim Amount**: $\max(0, \text{Demurrage Amount} - \text{Despatch Amount})$.

---

### Q18: What is Timebar?
**Answer**: A contractual legal deadline stipulating that notice of demurrage must be tendered (usually within 30 days) and full claim documents must be submitted (usually within 90 days) following discharge. If a deadline expires before submission, the claim is legally extinguished. Our system calculates the exact deadlines from the voyage end date and displays 4-stage color-coded alerts (`Normal`, `Approaching`, `Critical`, `Expired`).

---

### Q19: What is RAC?
**Answer**: RAC stands for **Recoverable Adjustment Claim**. It is a specialized module for tracking contentious deductions (such as disputed shore crane breakdowns or weather arguments) that cannot be resolved immediately on the primary timesheet. RAC maintains its own status lifecycle (`Draft` -> `Submitted` -> `Under Review` -> `Reviewed` -> `Closed`) and configurable calculation engine.

---

### Q20: How does the dashboard work?
**Answer**: The dashboard aggregates all active claims in real time. It computes Total Demurrage Owed, Demurrage Received, Outstanding Exposure, and Amount Under Contention. Users can filter by commercial client, claim type, status, or date range, which dynamically recalculates KPI metrics and re-renders Recharts graphs.

---

### Q21: How does analytics work?
**Answer**: Analytics aggregates claims data along three dimensions:
1. Status Distribution (Donut Chart showing proportions of settled, disputed, submitted, and review claims).
2. Demurrage vs. Cash Collection Trend (Area Chart plotting financial billing vs. actual payments over time).
3. Counterparty Exposure Breakdown (Horizontal Bar Chart ranking counterparties by outstanding liability).

---

### Q22: How does OCR work?
**Answer**: The OCR module (`lib/ocr/processor.ts`) simulates text extraction from scanned Statement of Facts PDFs and images. It parses key events, assigns confidence ratings (0% to 100%), flags low-confidence readings (<80%), and highlights inconsistencies (e.g. missing berths or inverted timestamps) for human review and correction.

---

### Q23: What is the biggest technical challenge?
**Answer**: Implementing the **Edge Middleware authentication layer with zero external dependencies**. Because Next.js Edge Middleware runs in a restricted sandbox without Node's `crypto` module, standard libraries like `jsonwebtoken` throw runtime errors. We solved this by implementing native Web Crypto API (`crypto.subtle`) HMAC-SHA256 signature verification in [lib/auth/edge-jwt.ts](file:///C:/Lay%20time/lib/auth/edge-jwt.ts).

---

### Q24: What are the limitations?
**Answer**:
1. No live satellite AIS vessel GPS tracking.
2. OCR uses template/heuristic extraction rather than external cloud computer vision models.
3. Outbound email chasers are logged in the database but not connected to live SMTP mail servers.
4. SQLite runs as a local file, suitable for single-node deployments (though a PostgreSQL schema is available in `backend/`).

---

### Q25: What can be added in future?
**Answer**:
1. Integration with MarineTraffic AIS APIs for automated vessel coordinate verification.
2. Cloud Document AI (AWS Textract / Gemini Vision) for deep learning OCR of handwritten port logs.
3. Live Microsoft 365 / Google Workspace IMAP email ingestion for dispute correspondence.
4. Electronic signature workflows (DocuSign API) for bilateral settlement agreements.

---

### Q26: How is the project different from manual claim processing?
**Answer**: Manual claim processing relies on static Excel workbooks vulnerable to formula errors, lacks real-time timebar expiration alerts, provides no automated discrepancy checking for impossible timestamps, and offers zero role-based access control. Our application automates mathematical calculations, provides proactive timebar alerts, verifies chronological consistency, generates formatted PDF reports instantly, and enforces role security with full auditability.
