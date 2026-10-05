# API Endpoints & Route Handlers Specification

This document provides complete technical documentation for every server-side API endpoint implemented under `app/api/`.

---

## 1. Master API Catalog

| Endpoint | Method | Authentication | Required Role | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `/api/auth/login` | `POST` | Public | None | Verify credentials, sign JWT, and issue secure session cookie. |
| `/api/auth/logout` | `POST` | Public | None | Invalidate session cookie (`Max-Age=0`). |
| `/api/auth/me` | `GET` | Authenticated | Any active | Retrieve active session user profile from SQLite. |
| `/api/claims` | `GET` | Authenticated | Any active | Fetch paginated, filtered claims list. |
| `/api/claims` | `POST` | Authenticated | Admin, Supervisor, Processor | Create a new claim with ports, berths, and activities. |
| `/api/claims/:id` | `GET` | Authenticated | Any active | Fetch detailed claim record with full relational children. |
| `/api/claims/:id` | `PUT` | Authenticated | Admin, Supervisor, Assigned Processor | Update commercial particulars, status, or settlement amounts. |
| `/api/claims/:id` | `DELETE` | Authenticated | Admin, Supervisor | Delete claim record (cascading delete on ports, berths, SoF). |
| `/api/claims/:id/chasers` | `POST` | Authenticated | Admin, Supervisor, Assigned Processor | Schedule an email followup chaser for outstanding payments. |
| `/api/claims/:id/missing-docs`| `GET` | Authenticated | Any active | Audit missing documents for a claim. |
| `/api/claims/:id/owner-comparison` | `POST` | Authenticated | Admin, Supervisor, Assigned Processor | Persist Owner vs Charterer internal demurrage comparisons. |
| `/api/users` | `GET` | Authenticated | **Admin Only** | Fetch complete user directory with assigned claim counts. |
| `/api/users` | `POST` | Authenticated | **Admin Only** | Register new user account with bcrypt-hashed password. |
| `/api/users/:id` | `GET` | Authenticated | **Admin Only** | Fetch single user details. |
| `/api/users/:id` | `PUT` | Authenticated | **Admin Only** | Update user name, email, role, or password. |
| `/api/users/:id` | `DELETE` | Authenticated | **Admin Only** | Deactivate user account (`status = 'Inactive'`). |
| `/api/rac/cases` | `GET` | Authenticated | Any active | List filterable Recoverable Adjustment Claim cases. |
| `/api/rac/cases` | `POST` | Authenticated | Admin, Supervisor, Processor | Create a new RAC dispute case. |
| `/api/rac/cases/:id` | `GET` | Authenticated | Any active | Retrieve specific RAC case details. |
| `/api/rac/cases/:id` | `PUT` | Authenticated | Admin, Supervisor, Assigned Processor | Update RAC case parameters or status. |
| `/api/rac/cases/:id` | `DELETE` | Authenticated | Admin, Supervisor | Delete RAC case. |
| `/api/rac/calculations` | `POST` | Authenticated | Any active | Execute configurable RAC mathematical engine. |
| `/api/dashboard` | `GET` | Authenticated | Any active | Aggregate portfolio KPI metrics and chart datasets. |
| `/api/documents` | `POST` | Authenticated | Admin, Supervisor, Processor | Record uploaded document metadata. |
| `/api/documents/:id` | `DELETE` | Authenticated | Admin, Supervisor | Delete document file record. |
| `/api/ocr` | `POST` | Authenticated | Admin, Supervisor, Processor | Process document OCR extraction and detect discrepancies. |
| `/api/oil-chem` | `POST` | Authenticated | Any active | Calculate ASTM 54B VCF factors and pumping warranties. |
| `/api/notifications` | `GET`/`PUT`| Authenticated | Any active | Fetch unread alerts or mark notifications as read. |
| `/api/timesheet/import` | `POST` | Authenticated | Admin, Supervisor, Processor | Parse and import spreadsheet timesheets. |
| `/api/settings` | `GET`/`PUT`| Authenticated | Admin, Supervisor (PUT) | Get or update global calculation business rules. |

---

## 2. Selected Endpoint Specifications

### `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "rajvardhanwadkar76@gmail.com",
    "password": "Raj@123"
  }
  ```
- **Validation**: Email format regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), non-empty strings.
- **Database Query**: `SELECT * FROM users WHERE LOWER(email) = LOWER(?)`.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr-001",
      "name": "Rajvardhan Wadkar",
      "email": "rajvardhanwadkar76@gmail.com",
      "role": "Admin",
      "status": "Active"
    }
  }
  ```
- **Set-Cookie Header**: `laytime_auth_token=<JWT>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`

---

### `PUT /api/claims/:id`
- **Headers**: `Cookie: laytime_auth_token=<token>`
- **Authorization**: Checked via `canEditClaim(session.role, session.email, existing.assignedTo, session.name)`.
- **Role Permissions**:
  - `Admin`, `Supervisor`: Unrestricted.
  - `Claim Processor`: Only allowed if `existing.assignedTo` matches user.
  - `Reviewer`: Aborts with `403 Forbidden: Reviewers have read-only access`.
- **Request Body**: Partial claim object (e.g. `{ "claimStatus": "Review", "agreedAmount": 85000 }`).
- **Database Query**: Dynamic SQL `UPDATE claims SET ... WHERE id = ?`.
- **Response (`200 OK`)**: `{ "success": true, "claim": { ... } }`.
