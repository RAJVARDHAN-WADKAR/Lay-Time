# Complete Technology Stack Inventory

This document details every technology, framework, database, and library verified to exist and execute within the project codebase.

---

## 1. Core Framework & Runtime

### Next.js
- **Version**: `14.2.15` (running `14.2.35` patch)
- **Purpose**: Full-stack React application framework providing the App Router architecture, Server-Side API Route Handlers, Edge Middleware, Static Site Generation (SSG), and Server Component support.
- **Where Used**: Root routing, [app/](file:///C:/Lay%20time/app), [middleware.ts](file:///C:/Lay%20time/middleware.ts), [next.config.mjs](file:///C:/Lay%20time/next.config.mjs).
- **Why Needed**: Enables unified server-and-client architecture without needing separate deployment pipelines for API routes and frontend pages.
- **Key Files**: [middleware.ts](file:///C:/Lay%20time/middleware.ts), [app/layout.tsx](file:///C:/Lay%20time/app/layout.tsx), [app/page.tsx](file:///C:/Lay%20time/app/page.tsx), [app/api/](file:///C:/Lay%20time/app/api).

### React & React DOM
- **Version**: `18.3.1`
- **Purpose**: Declarative UI component rendering, client-side state hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), and Context API.
- **Where Used**: All components and pages in [components/](file:///C:/Lay%20time/components) and [app/](file:///C:/Lay%20time/app).
- **Why Needed**: Standard component abstraction for dynamic maritime ledger views, modals, tabs, and KPI cards.
- **Key Files**: [lib/context/AuthContext.tsx](file:///C:/Lay%20time/lib/context/AuthContext.tsx), [components/claims/Step1General.tsx](file:///C:/Lay%20time/components/claims/Step1General.tsx).

### TypeScript
- **Version**: `5.6.3`
- **Purpose**: Strict static typing, contract safety, interface enforcement, and compiler verification.
- **Where Used**: Entire project (`.ts` and `.tsx` files), configured in [tsconfig.json](file:///C:/Lay%20time/tsconfig.json).
- **Why Needed**: Prevents runtime calculation errors, missing date property exceptions, and enforces domain type structures for claims, ports, berths, and activities.
- **Key Files**: [lib/types/index.ts](file:///C:/Lay%20time/lib/types/index.ts), [tsconfig.json](file:///C:/Lay%20time/tsconfig.json).

---

## 2. Database & Data Persistence

### better-sqlite3
- **Version**: `13.0.3` (with `@types/better-sqlite3: ^9.6.0`)
- **Purpose**: High-performance, synchronous SQLite3 driver for Node.js.
- **Where Used**: [lib/db/index.ts](file:///C:/Lay%20time/lib/db/index.ts), [lib/db/queries.ts](file:///C:/Lay%20time/lib/db/queries.ts), [lib/db/seed.ts](file:///C:/Lay%20time/lib/db/seed.ts).
- **Why Needed**: Embeds a zero-configuration, ACID-compliant relational SQL engine directly in [data/laytime.db](file:///C:/Lay%20time/data/laytime.db) without requiring a separate PostgreSQL server for local operation.
- **Key Files**: [lib/db/schema.ts](file:///C:/Lay%20time/lib/db/schema.ts), [lib/db/queries.ts](file:///C:/Lay%20time/lib/db/queries.ts), [data/laytime.db](file:///C:/Lay%20time/data/laytime.db).

---

## 3. Security & Authentication

### bcryptjs
- **Version**: `3.0.3` (with `@types/bcryptjs: ^2.4.6`)
- **Purpose**: Secure password hashing using the Blowfish-based bcrypt algorithm with automated salt generation.
- **Where Used**: [lib/auth/password.ts](file:///C:/Lay%20time/lib/auth/password.ts), [scripts/seed-users.js](file:///C:/Lay%20time/scripts/seed-users.js), [app/api/auth/login/route.ts](file:///C:/Lay%20time/app/api/auth/login/route.ts).
- **Why Needed**: Prevents plaintext password storage in [data/laytime.db](file:///C:/Lay%20time/data/laytime.db) and provides constant-time comparison against hash digests.
- **Key Files**: [lib/auth/password.ts](file:///C:/Lay%20time/lib/auth/password.ts), [app/api/auth/login/route.ts](file:///C:/Lay%20time/app/api/auth/login/route.ts).

### jsonwebtoken
- **Version**: `9.0.3` (with `@types/jsonwebtoken: ^9.0.10`)
- **Purpose**: Cryptographic JSON Web Token (JWT) generation and verification for server-side API handlers.
- **Where Used**: [lib/auth/jwt.ts](file:///C:/Lay%20time/lib/auth/jwt.ts), [app/api/auth/login/route.ts](file:///C:/Lay%20time/app/api/auth/login/route.ts).
- **Why Needed**: Encapsulates user session claims (userId, email, name, role) in signed HTTP-Only session cookies.
- **Key Files**: [lib/auth/jwt.ts](file:///C:/Lay%20time/lib/auth/jwt.ts), [lib/auth/session.ts](file:///C:/Lay%20time/lib/auth/session.ts).

### Web Crypto API (`crypto.subtle`)
- **Version**: Native Web Standard (ECMAScript / Edge Runtime)
- **Purpose**: Zero-dependency HMAC-SHA256 signature verification in Next.js Edge Middleware.
- **Where Used**: [lib/auth/edge-jwt.ts](file:///C:/Lay%20time/lib/auth/edge-jwt.ts), [middleware.ts](file:///C:/Lay%20time/middleware.ts).
- **Why Needed**: Next.js Edge Middleware runs in a restricted sandbox where Node's `crypto` module is not supported. Web Crypto runs natively in Edge runtime without bundling external dependencies.
- **Key Files**: [lib/auth/edge-jwt.ts](file:///C:/Lay%20time/lib/auth/edge-jwt.ts), [middleware.ts](file:///C:/Lay%20time/middleware.ts).

---

## 4. UI Layout, Styling & Components

### Tailwind CSS
- **Version**: `3.4.14` (with `autoprefixer: ^10.4.20`, `postcss: ^8.4.47`)
- **Purpose**: Utility-first CSS framework for responsive layout design, theme consistency, and custom maritime color palette (`#0B192C`, `slate-900`, `blue-600`).
- **Where Used**: [tailwind.config.js](file:///C:/Lay%20time/tailwind.config.js), [app/globals.css](file:///C:/Lay%20time/app/globals.css), all UI components.
- **Why Needed**: Ensures mobile/desktop responsiveness without bloated custom CSS files.
- **Key Files**: [tailwind.config.js](file:///C:/Lay%20time/tailwind.config.js), [app/globals.css](file:///C:/Lay%20time/app/globals.css).

### Lucide React
- **Version**: `0.453.0`
- **Purpose**: High-quality SVG icon system tailored for maritime, dashboard, and administrative actions.
- **Where Used**: [components/layout/Sidebar.tsx](file:///C:/Lay%20time/components/layout/Sidebar.tsx), [components/layout/Header.tsx](file:///C:/Lay%20time/components/layout/Header.tsx), [app/login/page.tsx](file:///C:/Lay%20time/app/login/page.tsx).
- **Why Needed**: Consistent visual language for ships, anchors, calculators, warning badges, eye toggles, and security locks.

### clsx & tailwind-merge
- **Versions**: `clsx: ^2.1.1`, `tailwind-merge: ^2.5.4`
- **Purpose**: Conditional CSS class combining and conflict-free Tailwind utility merging.
- **Where Used**: [lib/utils/cn.ts](file:///C:/Lay%20time/lib/utils/cn.ts).
- **Why Needed**: Enables custom styling overrides in reusable component primitives without CSS specificity wars.

---

## 5. Tables, Charts & Visualizations

### @tanstack/react-table
- **Version**: `8.20.5`
- **Purpose**: Headless table engine providing multi-column sorting, column filtering, column visibility presets, and pagination.
- **Where Used**: [components/claims/LedgerTable.tsx](file:///C:/Lay%20time/components/claims/LedgerTable.tsx), [app/claims/page.tsx](file:///C:/Lay%20time/app/claims/page.tsx).
- **Why Needed**: Powers the 32-column Master Claims Ledger with sorting and column toggle controls.

### Recharts
- **Version**: `2.13.0`
- **Purpose**: Composable SVG charting library for React.
- **Where Used**: [app/dashboard/page.tsx](file:///C:/Lay%20time/app/dashboard/page.tsx), [app/analytics/page.tsx](file:///C:/Lay%20time/app/analytics/page.tsx).
- **Why Needed**: Renders Donut/Pie charts (claim status), Area charts (financial collection trends), and Horizontal Bar charts (counterparty exposure).

---

## 6. Document Generation & Export

### jsPDF & jspdf-autotable
- **Versions**: `jspdf: ^2.5.2`, `jspdf-autotable: ^3.8.4`
- **Purpose**: Pure client-side PDF document generation and automated table pagination.
- **Where Used**: [lib/utils/exportPdf.ts](file:///C:/Lay%20time/lib/utils/exportPdf.ts), [app/reports/page.tsx](file:///C:/Lay%20time/app/reports/page.tsx), [app/claims/[id]/page.tsx](file:///C:/Lay%20time/app/claims/%5Bid%5D/page.tsx).
- **Why Needed**: Enables one-click downloading of formatted, professional commercial Demurrage Claim PDF reports directly in the user's browser without server rendering overhead.

---

## 7. Forms, Validation & Utilities

### React Hook Form & Zod
- **Versions**: `react-hook-form: ^7.53.0`, `zod: ^3.23.8`, `@hookform/resolvers: ^3.9.0`
- **Purpose**: Performant form state management and strict runtime schema validation.
- **Where Used**: [components/claims/Step1General.tsx](file:///C:/Lay%20time/components/claims/Step1General.tsx), [app/claims/create/page.tsx](file:///C:/Lay%20time/app/claims/create/page.tsx).
- **Why Needed**: Validates required contract dates, demurrage rates, and counterparty fields with immediate inline feedback before submission.

### uuid
- **Version**: `14.0.2` (with `@types/uuid: ^10.0.0`)
- **Purpose**: RFC 4122 compliant Universally Unique Identifier (UUIDv4) generation.
- **Where Used**: [lib/db/queries.ts](file:///C:/Lay%20time/lib/db/queries.ts), [lib/mock/clientStore.ts](file:///C:/Lay%20time/lib/mock/clientStore.ts).
- **Why Needed**: Generates unique primary keys for ports, berths, Statement of Facts activities, discrepancies, and notifications.

### Tesseract.js & pdf-parse
- **Versions**: `tesseract.js: ^7.0.0`, `pdf-parse: ^2.4.5` (with `@types/pdf-parse: ^1.1.5`)
- **Purpose**: Client-side optical character recognition and server-side PDF text extraction libraries.
- **Where Used**: Installed in [package.json](file:///C:/Lay%20time/package.json); wrapped by [lib/ocr/processor.ts](file:///C:/Lay%20time/lib/ocr/processor.ts) and [app/api/ocr/route.ts](file:///C:/Lay%20time/app/api/ocr/route.ts).
- **Why Needed**: Provides text extraction baseline for scanned documents and Statement of Facts inspection.

---

## 8. Companion Architecture: Standalone NestJS Backend (`backend/`)

In addition to the primary Next.js full-stack system, the repository contains a standalone enterprise NestJS microservice template in [backend/](file:///C:/Lay%20time/backend) with:
- **NestJS v10.4.4**: Modular enterprise TypeScript framework (`@nestjs/common`, `@nestjs/core`, `@nestjs/jwt`, `@nestjs/passport`).
- **Prisma ORM v5.20.0**: PostgreSQL database ORM schema and migrations (`prisma/schema.prisma`).
- **Swagger / OpenAPI v7.4.2**: API documentation generator (`@nestjs/swagger`, `swagger-ui-express`).
- **Docker Compose**: Pre-configured multi-container orchestration for PostgreSQL 16 and NestJS API in [docker-compose.yml](file:///C:/Lay%20time/docker-compose.yml).
