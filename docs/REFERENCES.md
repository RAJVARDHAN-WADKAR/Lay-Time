# Authoritative References & Standards

This document catalogs the authoritative technical specifications, library documentation, international maritime legal standards, and industry guidelines supporting this system.

---

## 1. Official Technology Documentation

1. **Next.js Documentation**
   - **Organization**: Vercel Inc.
   - **URL**: [https://nextjs.org/docs](https://nextjs.org/docs)
   - **Supported Concepts**: App Router, Route Handlers, Edge Middleware sandbox, Server Components, and Cache Control.

2. **React 18 Documentation**
   - **Organization**: Meta Open Source
   - **URL**: [https://react.dev](https://react.dev)
   - **Supported Concepts**: Hooks lifecycle (`useState`, `useEffect`, `useCallback`, `useMemo`), Context API, Suspense boundaries.

3. **TypeScript Handbook**
   - **Organization**: Microsoft Corporation
   - **URL**: [https://www.typescriptlang.org/docs](https://www.typescriptlang.org/docs)
   - **Supported Concepts**: Static typing, structural interfaces, union types, and compiler type-checking.

4. **Tailwind CSS Documentation**
   - **Organization**: Tailwind Labs Inc.
   - **URL**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
   - **Supported Concepts**: Utility-first CSS, custom theme configuration, responsive breakpoints.

5. **better-sqlite3 Documentation**
   - **Organization**: Joshua Wise / WiseLibs
   - **URL**: [https://github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
   - **Supported Concepts**: Synchronous execution, WAL mode pragma, prepared statements, and transaction management.

6. **TanStack Table v8 Documentation**
   - **Organization**: Tanner Linsley / TanStack
   - **URL**: [https://tanstack.com/table/v8](https://tanstack.com/table/v8)
   - **Supported Concepts**: Headless table virtualization, multi-column sorting, column filtering, and visibility state.

7. **Recharts Documentation**
   - **Organization**: Recharts Community
   - **URL**: [https://recharts.org](https://recharts.org)
   - **Supported Concepts**: ResponsiveContainer, AreaChart, BarChart, PieChart, and dynamic tooltips.

8. **jsPDF & jspdf-autotable**
   - **Organization**: Parallax / Simon Tenggren
   - **URL**: [https://github.com/parallax/jsPDF](https://github.com/parallax/jsPDF) | [https://github.com/simonbengtsson/jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
   - **Supported Concepts**: Client-side PDF canvas rendering, auto-table layout, and multi-page pagination.

9. **Web Crypto API (SubtleCrypto)**
   - **Organization**: World Wide Web Consortium (W3C) / MDN Web Docs
   - **URL**: [https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
   - **Supported Concepts**: Native HMAC-SHA256 signature verification in Edge environments.

10. **Bcrypt Password-Hashing Function**
    - **Authors**: Niels Provos and David Mazières
    - **URL**: [https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf](https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf)
    - **Supported Concepts**: Adaptive Blowfish key derivation algorithm with salt generation.

---

## 2. International Maritime Industry Standards

1. **Laytime Definitions for Charter Parties 2013**
   - **Publishing Bodies**: Baltic and International Maritime Council (BIMCO), Comité Maritime International (CMI), FONASBA, and INTERCARGO.
   - **URL**: [https://www.bimco.org/contracts-and-clauses/laytime-definitions-for-charter-parties-2013](https://www.bimco.org/contracts-and-clauses/laytime-definitions-for-charter-parties-2013)
   - **Supported Concepts**: Formal definitions of "Notice of Readiness", "Weather Working Day (WWD)", "SHEX (Sundays and Holidays Excepted)", "SHINC (Sundays and Holidays Included)", "Demurrage", and "Despatch".

2. **Standard Charter Party Contracts & Clauses**
   - **BPVOY4**: British Petroleum Voyage Charter Party Form 1998 (Standard Tanker Terms, Clause 18 Breakdown, Clause 20 Timebar).
   - **SHELLVOY6**: Shell Voyage Charterparty Form 2005 (Pumping warranty rates, manifold connections, and Notice timebars).
   - **ASBATANKVOY**: Association of Ship Brokers & Agents (Tanker Voyage Charter Party).
   - **GENCON 94**: BIMCO Uniform General Charter (Dry Bulk Voyage terms, laytime cancellation clauses).
   - **NYPE 93**: New York Produce Exchange Time Charter (BIMCO/ASBA).
   - **URL**: [https://www.bimco.org/contracts-and-clauses](https://www.bimco.org/contracts-and-clauses)

3. **Petroleum Measurement Standards (ASTM D1250 / API MPMS Chapter 11.1)**
   - **Organization**: American Society for Testing and Materials (ASTM) / American Petroleum Institute (API)
   - **URL**: [https://www.astm.org/d1250-19m.html](https://www.astm.org/d1250-19m.html)
   - **Supported Concepts**: Standard Table 54B Volume Correction Factors (VCF) for generalized crude oils and petroleum products based on thermal expansion coefficient ($\alpha = 0.00065$) and standard reference temperature of 15°C.

4. **Maritime Arbitration & Case Law Precedents**
   - **The "Mira N" [1990] 1 Lloyd's Rep 484**: Precedent regarding strict enforcement of documentary compliance and timebars in demurrage presentation.
   - **The "Abqaiq" [2012] 1 Lloyd's Rep 18 (CA)**: English Court of Appeal ruling on 90-day timebar clauses and supporting documents completeness.
