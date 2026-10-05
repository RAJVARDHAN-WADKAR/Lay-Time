# System Limitations & Future Scope

This document provides a transparent, objective audit of the system's current architectural boundaries, technical limitations, and roadmap for enterprise production scaling.

---

## 1. Current Technical Limitations

### 1. No Live Satellite AIS / Telemetry Integration
- **Status**: `PLANNED / NOT IMPLEMENTED`
- **Current Behavior**: Vessel arrival timestamps, Notice of Readiness (NOR) dates, and voyage endpoints are either pre-loaded from seed data or manually entered by the user.
- **Limitation**: The system does not automatically poll live AIS transponder feeds (e.g. MarineTraffic, Spire Maritime, VesselFinder) to verify if a ship was physically anchored within port limits when NOR was tendered.

### 2. Simulated OCR Pipeline
- **Status**: `HYBRID / RULE-BASED SIMULATION`
- **Current Behavior**: The OCR module ([lib/ocr/processor.ts](file:///C:/Lay%20time/lib/ocr/processor.ts)) processes uploaded PDFs and images using pre-configured extraction templates and confidence scoring heuristics based on document content keywords (e.g. Antwerp, Rotterdam, messy scan samples).
- **Limitation**: It does not currently invoke an external GPU-backed Computer Vision model (e.g. AWS Textract, Google Cloud Document AI, or fine-tuned LLM vision models) to dynamically parse unstandardized handwritten port logs.

### 3. Client-Store vs. Database Synchronization Duality
- **Status**: `IMPLEMENTED DUAL-LAYER`
- **Current Behavior**: The system features both a server-side SQLite relational database ([data/laytime.db](file:///C:/Lay%20time/data/laytime.db)) accessed via `app/api/*` AND a browser client store ([lib/mock/clientStore.ts](file:///C:/Lay%20time/lib/mock/clientStore.ts)) in `localStorage` for offline interactivity.
- **Limitation**: In a multi-user distributed enterprise environment, all write operations should be consolidated exclusively onto the server-side database with WebSockets / Server-Sent Events (SSE) for real-time client state sync.

### 4. Mocked Email Transmission Engine
- **Status**: `DATABASE PERSISTED / MOCK TRANSMISSION`
- **Current Behavior**: Scheduled email chasers and counterparty follow-up logs are recorded in the `email_followups` table with templates, recipient addresses, and dates.
- **Limitation**: Direct outbound SMTP/IMAP protocol integration (e.g. AWS SES, SendGrid, Resend) is not actively executing real network email delivery.

### 5. Single-Node Database Architecture
- **Status**: `LOCAL RELATIONAL DATABASE`
- **Current Behavior**: The production application uses `better-sqlite3` on a single filesystem node.
- **Limitation**: SQLite is exceptional for edge computing, local testing, and desktop/single-server deployments, but horizontal scaling across multiple Kubernetes pods requires migrating to the companion PostgreSQL/Prisma service defined in [backend/](file:///C:/Lay%20time/backend).

---

## 2. Future Development Roadmap

1. **Live Maritime Telemetry Ingestion**: Connect to MarineTraffic / DNV AIS APIs to automatically cross-reference NOR tender coordinates against official port anchorage polygons.
2. **Multimodal Document AI**: Connect AWS Textract or Gemini Vision 1.5 Pro to automatically OCR physical stamped Statements of Facts with automatic key-value extraction into the timesheet.
3. **Automated Charter Party Clause Parser**: Utilize Natural Language Processing (NLP) to ingest unformatted PDF charter parties and extract demurrage rates, grace periods, and timebar clauses automatically.
4. **Outbound Email & IMAP Ingestion**: Connect live Microsoft Graph / Google Workspace APIs to ingest counterparty claim dispute emails and parse attachments directly into the incoming queue.
5. **Electronic Signature Integration**: Support DocuSign / Adobe Sign integration for mutually agreed final Demurrage Settlement Agreements.
