# Complete Project Glossary

A unified reference guide defining commercial maritime terminology and technical software engineering concepts used throughout the project.

---

## 1. Maritime & Commercial Demurrage Terminology

- **Laytime**: The contractually agreed period of time allowed to a charterer for loading and discharging cargo without incurring additional charges beyond the agreed freight.
- **Demurrage**: An agreed financial compensation paid by the charterer to the shipowner when cargo operations exceed the contractual allowed laytime. Usually quoted as a daily dollar rate (e.g. $30,000/day).
- **Despatch (Dispatch)**: An agreed rebate or refund paid by the shipowner to the charterer when cargo operations complete before the allowed laytime expires. Typically calculated at 50% of the daily demurrage rate.
- **Charter Party (C/P)**: The formal legal contract between a shipowner and a charterer governing the commercial employment and freight of the ocean vessel (e.g. BPVOY4, SHELLVOY6, ASBATANKVOY, GENCON).
- **Notice of Readiness (NOR)**: A formal notice tendered by the ship's Master or port agent advising charterers/receivers that the vessel has arrived at the agreed port/anchorage and is in all respects ready to load or discharge cargo.
- **Statement of Facts (SoF)**: A chronological operational log certifying all events, cargo activities, delays, weather interruptions, crane stoppages, and shifting occurring while the vessel was in port. Signed by Master, Agent, and Terminal.
- **Weather Working Day (WWD)**: A day of 24 consecutive hours during which work on the vessel can proceed without interruption by weather (rain, high swell, gale force winds).
- **SHINC (Sundays & Holidays Included)**: Contractual clause indicating that laytime counts continuously through weekends and public holidays.
- **SHEX (Sundays & Holidays Excepted)**: Contractual clause indicating that weekends and public holidays are excluded from counting against laytime unless work is actually performed.
- **Allowed Laytime**: The total duration in days/hours allocated to the charterer calculated as $\text{Cargo Quantity} / \text{Handling Rate}$.
- **Used (Consumed) Laytime**: The net time actually counted against the charterer after subtracting allowable exceptions and contractual deductions.
- **Excess Laytime**: Net time used in excess of allowed laytime, resulting in demurrage charges.
- **Timebar**: A strict contractual exclusion clause stipulating that claims or notices must be formally presented within an agreed timeframe (e.g. 30 days for notice, 90 days for claim), failing which the claim is legally forfeited.
- **RAC (Recoverable Adjustment Claim)**: A dedicated dispute case tracking disputed deductions, terminal offsets, and contentious items for separate negotiation and commercial recovery.
- **Prorata Allocation**: The proportional distribution of shared laytime, delays, or demurrage costs between multiple cargo receivers or parcel owners sharing the same vessel or berth.
- **Pumping Warranty**: Contractual guarantee given by tanker owners regarding minimum discharge rate (e.g. 1,000 $m^3$/hr) or minimum manifold pressure (e.g. 7.0 bar). Failure to meet the warranty allows charterers to deduct excess pumping hours from laytime.
- **Crude Oil Washing (COW)**: Maritime operation on crude oil tankers where cargo tanks are washed using high-pressure crude oil during discharge to prevent sludge accumulation. Usually allotted 2–3 contractually allowed hours.
- **VCF (Volume Correction Factor)**: Temperature and density correction multiplier derived from ASTM Table 54B to convert liquid petroleum quantities from observed temperature to standard 15°C baseline.

---

## 2. Technical & Software Architecture Terminology

- **App Router**: Next.js 14 file-system based routing architecture using React Server Components, Route Handlers, and nested layouts.
- **Edge Middleware**: Lightweight software interceptor running on Cloudflare Workers / Vercel Edge sandboxes before HTTP requests reach page components.
- **JSON Web Token (JWT)**: An open standard (RFC 7519) compact URL-safe token format representing verifiable security claims signed with HMAC-SHA256.
- **HttpOnly Cookie**: A browser cookie configuration attribute that prevents client-side scripts from reading the cookie, mitigating Cross-Site Scripting (XSS) session hijacking.
- **Role-Based Access Control (RBAC)**: Security authorization pattern restricting system actions based on assigned organizational roles (`Admin`, `Claim Processor`, `Supervisor`, `Reviewer`).
- **better-sqlite3**: A synchronous, zero-dependency C++ bindings library for SQLite3 in Node.js, providing rapid disk I/O and transactional guarantees.
- **Write-Ahead Logging (WAL)**: An ACID database storage architecture where modifications are appended to a separate log file (`.db-wal`) before merging to the main database file, drastically increasing concurrent read concurrency.
- **Headless Table Engine**: A UI architecture (such as TanStack Table) that manages data sorting, pagination, and filtering logic without prescribing UI markup or CSS styling.
- **Recharts**: A modular React data visualization library built on top of D3 mathematical formulas and SVG elements.
- **jsPDF**: A JavaScript document generation library that renders vector shapes, typography, and tabular reports directly to PDF binary format in the client browser.
- **Zod**: A TypeScript-first schema declaration and runtime validation library with static type inference.
