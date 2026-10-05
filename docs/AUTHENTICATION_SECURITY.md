# Authentication & Security Architecture

This document details the security posture, authentication protocols, cryptography, and access control mechanisms implemented in the system.

---

## 1. Authentication Mechanisms

### 1. Password Hashing & Storage
- **Cryptographic Algorithm**: Blowfish-based **`bcrypt`** ([bcryptjs](file:///C:/Lay%20time/lib/auth/password.ts)) with a cost factor of **10 salt rounds**.
- **No Plaintext Storage**: Plaintext passwords are never written to disk, saved in database columns, logged in server output, or cached in client memory.
- **Hash Format**: Standard `$2a$10$...` modular crypt format stored in the `users.password_hash` column.

### 2. Session Management & JWT Issuance
- **Token Format**: Standard RFC 7519 JSON Web Token signed with HMAC-SHA256.
- **Payload Structure**:
  ```json
  {
    "userId": "usr-001",
    "email": "rajvardhanwadkar76@gmail.com",
    "name": "Rajvardhan Wadkar",
    "role": "Admin",
    "iat": 1790952237,
    "exp": 1791557037
  }
  ```
- **Session Duration**: 7 days (`604,800` seconds).
- **Cookie Security Flags**:
  - `HttpOnly = true`: Token cannot be accessed or stolen via client-side JavaScript (`document.cookie`), preventing Cross-Site Scripting (XSS) token theft.
  - `SameSite = Lax`: Protects against Cross-Site Request Forgery (CSRF) on cross-origin requests while preserving top-level navigation.
  - `Path = /`: Scoped across the entire application domain.
  - `Secure`: Dynamically set to `true` in production environments (`NODE_ENV === "production"`).

---

## 2. Route Protection & Edge Middleware

The Next.js Edge Middleware ([middleware.ts](file:///C:/Lay%20time/middleware.ts)) intercepts every incoming request prior to page rendering:

1. **Static Asset Bypass**: Next.js internals (`/_next/*`), image assets, and `favicon.ico` bypass inspection.
2. **Public Auth Handlers**: `/login`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me` are publicly reachable.
3. **Edge-Native JWT Verification**: Uses standard Web Crypto API (`crypto.subtle`) in [lib/auth/edge-jwt.ts](file:///C:/Lay%20time/lib/auth/edge-jwt.ts).
4. **Unauthenticated Redirects**: If `laytime_auth_token` is missing or signature verification fails, requests to protected routes (`/dashboard`, `/claims`, `/rac`, `/timebar`, `/users`, etc.) are redirected to `/login?from=<original_path>`.
5. **Back-Button Cache Invalidation**: Sets HTTP response headers:
   ```http
   Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
   Pragma: no-cache
   Expires: 0
   ```
   This prevents web browsers from serving cached copies of sensitive claim figures when a user navigates backwards after logging out.

---

## 3. Server-Side Role Enforcement

Role security is enforced directly within the database queries and route handlers:
- **User Administration**: `app/api/users` verifies `session.role === "Admin"`. Any non-admin receives `403 Forbidden: Admin access required`.
- **Claim Modification**: `PUT /api/claims/:id` rejects Reviewers and checks whether Claim Processors own the claim:
  ```ts
  if (session.role === "Reviewer") {
    return NextResponse.json({ error: "Forbidden: Reviewers have read-only access." }, { status: 403 });
  }
  ```
- **Claim Deletion**: `DELETE /api/claims/:id` rejects all roles except `Admin` and `Supervisor`.

---

## 4. Development Credentials Reference

Four pre-configured role test accounts are seeded in the database for evaluation:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `rajvardhanwadkar76@gmail.com` | `Raj@123` |
| **Claim Processor** | `rohitmengane2975@gmail.com` | `Rohit@123` |
| **Supervisor** | `swayamghatage3839@gmail.com` | `Swayam@123` |
| **Reviewer** | `paraschougale558@gmail.com` | `Paras@123` |

---

## 5. Security Audit Findings & Hardening Recommendations

### Implemented Strengths:
✅ Secure `HttpOnly` cookies eliminate XSS token exfiltration.  
✅ Strong `bcrypt` password hashing with salt rounds.  
✅ Edge middleware intercepts unauthenticated navigation.  
✅ Server API routes validate role identity independently of the frontend UI.  
✅ SQL queries use parameterized prepared statements (`better-sqlite3`), completely preventing SQL Injection.  
✅ Environment variables isolate secrets (`JWT_SECRET`) from source control.  

### Recommendations for Future Production Hardening:
⚠️ **Rate Limiting**: Add IP-based and account-based rate limiting (e.g. max 5 failed attempts per 15 minutes) on `POST /api/auth/login` to mitigate brute-force dictionary attacks.  
⚠️ **Multi-Factor Authentication (MFA)**: Implement TOTP-based (Time-based One-Time Password) 2FA for privileged roles (`Admin`, `Supervisor`).  
⚠️ **Session Invalidation Store**: Implement a Redis or database-backed token blocklist to allow immediate revocation of JWT tokens prior to their 7-day natural expiration.
