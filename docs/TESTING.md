# Quality Assurance & Testing Suite Documentation

This document provides a comprehensive test plan, execution checklist, and automated test suite results.

---

## 1. Automated Test Suite Summary (`npm run test:auth`)

An automated test script located at [scripts/test-auth-suite.js](file:///C:/Lay%20time/scripts/test-auth-suite.js) exercises the full-stack authentication, route protection, and RBAC matrix against the live running server:

```
=========================================================
     AUTOMATED AUTHENTICATION & ACCESS CONTROL TEST SUITE
=========================================================
TEST SUITE RESULTS: 44 / 44 TESTS PASSED (100%)
=========================================================
```

### Verified Test Assertions:
1. **Unauthenticated Redirects**: `/dashboard`, `/claims`, `/timebar`, `/users`, and `/` redirect to `/login` with `307/302`.
2. **Unauthenticated API Access**: `GET /api/claims` returns `401 Unauthorized`.
3. **Email Validation**: Malformed email `invalid-email-string` returns `400 Bad Request` with message *"Please enter a valid corporate email address"*.
4. **Credential Rejection**: Incorrect password `WrongPassword999` returns `401 Unauthorized` with message *"Invalid email or password"*.
5. **Non-existent Users**: Unknown email addresses return `401 Unauthorized`.
6. **Admin Verification**: Successful login, JWT cookie issued, `/api/auth/me` verified, `/users` accessible, `/api/users` returns full directory.
7. **Claim Processor Enforcement**: Successful login, blocked from `/users` by middleware (`307` redirect to `/dashboard`), blocked from `GET /api/users` (`403 Forbidden`), permitted to edit assigned claim `CLM-2024-001` (`200 OK`), forbidden from editing unassigned claim `CLM-2024-003` (`403 Forbidden`).
8. **Supervisor Access**: Successful login, blocked from `/users`, permitted to edit any claim `CLM-2024-003` (`200 OK`).
9. **Reviewer Read-Only Enforcement**: Successful login, permitted to read claims (`200 OK`), forbidden from creating claims (`403`), forbidden from editing claims (`403`), forbidden from deleting claims (`403`), forbidden from user management (`403`).
10. **Logout Invalidation**: Session cookie cleared with `Max-Age=0`, subsequent `/api/auth/me` returns `401`, subsequent `/dashboard` access redirects to `/login`.

---

## 2. Manual & Functional Testing Checklist

### A. Authentication & Session Verification
- [x] Login with valid Admin credentials (`rajvardhanwadkar76@gmail.com` / `Raj@123`).
- [x] Login with valid Claim Processor credentials (`rohitmengane2975@gmail.com` / `Rohit@123`).
- [x] Login with valid Supervisor credentials (`swayamghatage3839@gmail.com` / `Swayam@123`).
- [x] Login with valid Reviewer credentials (`paraschougale558@gmail.com` / `Paras@123`).
- [x] Click Show/Hide password eye icon to toggle plaintext/masked password visibility.
- [x] Submit empty email/password and verify inline field error highlights.
- [x] Click Logout in sidebar or header profile menu; verify redirect to `/login`.
- [x] Click browser Back button after logout; verify protected content is NOT displayed.

### B. Role & Permission Governance
- [x] **Admin**: Navigate to `/users`, add a new analyst, edit their role, toggle active/inactive status.
- [x] **Claim Processor**: Verify that the `/users` link is hidden in the sidebar navigation.
- [x] **Claim Processor**: Direct browser navigation to `http://localhost:3000/users` is intercepted and redirected to `/dashboard`.
- [x] **Supervisor**: Open any claim, adjust agreed settlement figure, and verify update persists.
- [x] **Reviewer**: Verify that all `Edit Claim`, `Create Claim`, and `Add Activity` buttons are completely hidden across the UI.

### C. Mathematical Calculations
- [x] **Zero Laytime Exceeded**: When Net Laytime Used < Allowed Laytime, Demurrage is $0.00 and Despatch is earned.
- [x] **Demurrage Exceeded**: When Net Laytime Used > Allowed Laytime, Demurrage = `Exceeded Minutes * Rate / 1440`.
- [x] **Rain / Weather Interruption**: Set `percentageCounted = 0%` on a 6-hour event; verify 360 minutes are deducted.
- [x] **Prorata Sharing**: Set `prorata = 50%`; verify counted time is halved.
- [x] **Invalid Date Sequence**: Input stop time before start time; verify `detectDiscrepancies()` flags an error.

### D. Export & Reporting
- [x] Open `/reports`, select a claim, and click **Export PDF Report**.
- [x] Verify downloaded `.pdf` includes commercial metadata, port breakdowns, SoF table, and signatures.
- [x] Open `/claims`, apply client filter, and click **Export CSV**; verify filtered dataset downloads.
