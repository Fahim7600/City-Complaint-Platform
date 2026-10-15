# 🏙️ City Complaint & Service Request Platform

**Enterprise-grade backend REST API for reporting, routing, SLA tracking, and resolving municipal citizen complaints.**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Stripe](https://img.shields.io/badge/Stripe-SDK_22-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?logo=swagger&logoColor=black)](https://swagger.io)

---

## 🔗 Live Links

| Resource | Target URL / Placeholder |
|---|---|
| **Live API** | [https://city-complaint-platform-1.onrender.com](https://city-complaint-platform-1.onrender.com) |
| **Swagger UI Documentation** | [https://city-complaint-platform-1.onrender.com/api-docs](https://city-complaint-platform-1.onrender.com/api-docs) |
| **Health Check Endpoint** | [https://city-complaint-platform-1.onrender.com/api/v1/health](https://city-complaint-platform-1.onrender.com/api/v1/health) |
| **Postman Collection** | [City-Complaint-Platform.postman_collection.json](https://github.com/Fahim7600/City-Complaint-Platform/blob/main/postman/City-Complaint-Platform.postman_collection.json) |
| **Frontend Application** | `<ADD_FRONTEND_URL>` |

---

## 📖 Overview

The **City Complaint & Service Request Platform** is a production-ready municipal management backend. It empowers citizens to report civic infrastructure issues (e.g. road potholes, water leaks, traffic signal failures, sanitation problems) while giving municipal departments the tools to triage, assign, track, and resolve complaints within defined Service Level Agreements (SLAs).

### Key Features
- **Automated Routing & SLA Deadlines:** Issues are automatically routed to the responsible department based on the selected category, establishing a clear SLA countdown (`slaDueAt`).
- **Role-Based Lifecycles:** Distinct permissions and visibility boundaries for Citizens, Technicians, Department Managers, and Platform Administrators.
- **Background SLA Monitoring:** Automated cron worker detects overdue complaints hourly and notifies department managers.
- **Stripe Recurring Subscriptions:** Premium tier enabling priority complaint dispatching and expedited handling.
- **Evidence Management:** Multi-file Cloudinary integration with categorized evidence attachments (initial proof, before-work, after-work).
- **Citizen Feedback Loop:** Immutable 1-to-5 star ratings and reviews upon resolution with aggregated technician performance metrics.
- **Public Landing Overview:** Single-call public endpoint aggregates platform highlights, how-it-works workflow, role guides, tier comparisons, FAQs, calls-to-action, active departments, and live platform statistics.
- **Enterprise Security:** Tiered in-memory rate limiting, cross-site SameSite=None refresh token cookies, Helmet security headers, CORS allowlists, Zod validation, soft deletes, and complete audit logging.

---

## 👥 Features by Role

| Role | Key Capabilities & Permissions |
|---|---|
| **🧍 Citizen** | <ul><li>Register and log in via email/password or Google OAuth ID token.</li><li>Create, view, update, and search personal complaints with photo attachments.</li><li>Track monthly complaint usage and remaining quota (`GET /complaints/usage`).</li><li>Reopen personal resolved complaints within the reopen window (`PATCH /complaints/:id/reopen`).</li><li>Cancel personal complaints while in `PENDING` status.</li><li>Submit one immutable review & rating (1–5 stars) after a complaint is `RESOLVED`.</li><li>View public department listings, categories, stats, and technician ratings.</li><li>Manage an in-app notification inbox with read tracking.</li><li>Apply for staff roles (`TECHNICIAN` or `MANAGER`).</li><li>**Premium Subscription Benefit:** Subscribed citizens get automatic **`HIGH` Priority** on all new complaints and an elevated monthly complaint limit (20 vs 5).</li></ul> |
| **🔧 Technician** | <ul><li>Access dedicated list of assigned complaints (`/complaints/my-assigned`).</li><li>Toggle availability for incoming complaint assignments (`PATCH /technicians/me/availability`).</li><li>View live computed performance metrics and ratings (`GET /technicians/me/performance`).</li><li>Upload before-work and after-work photographic evidence.</li><li>Transition complaints: `ASSIGNED → IN_PROGRESS → RESOLVED` (mandatory resolution note).</li></ul> |
| **🗂️ Manager** | <ul><li>Scoped strictly to their assigned department.</li><li>Triage and re-prioritize incoming department complaints (`LOW`, `MEDIUM`, `HIGH`).</li><li>Assign/reassign active department technicians to pending complaints (with availability checks).</li><li>Escalate critical unresolvable department complaints to the admin queue (`PATCH /complaints/:id/escalate`).</li><li>Reject complaints with a required reason (`PENDING → REJECTED`).</li><li>Close resolved complaints (`RESOLVED → CLOSED`).</li><li>Reopen complaints back to work order with a required reason (`RESOLVED → IN_PROGRESS`).</li><li>Review and approve/reject department `TECHNICIAN` staff applications.</li><li>Invite technicians to their department with a temporary password (`POST /departments/my/technicians`), resend invites (`POST /departments/my/technicians/:id/resend-invite`), and remove technicians with zero active complaints (`DELETE /departments/my/technicians/:id`).</li><li>Receive automated `SLA_OVERDUE` alerts when complaints exceed resolution deadlines.</li></ul> |
| **👑 Admin** | <ul><li>Platform-wide visibility and administrative authority.</li><li>Manage the escalated complaints queue (`GET /admin/escalated-complaints`) and clear escalations (`PATCH /admin/complaints/:id/clear-escalation`).</li><li>Directly reassign or resolve escalated complaints across all municipal departments.</li><li>Inspect Stripe premium subscription pricing details (`GET /admin/premium-pricing`).</li><li>Full CRUD on municipal Departments and Service Categories.</li><li>Review and decide `MANAGER` staff applications across all departments.</li><li>Directly invite technicians and managers to any active department (`POST /admin/staff`) and resend invitations (`POST /admin/staff/:id/resend-invite`).</li><li>Override user roles and departmental assignments (capped: cannot self-grant `ADMIN`).</li><li>Deactivate/reactivate user accounts (guarded against self-lockout and last-admin deletion).</li><li>Trigger manual on-demand SLA overdue sweeps (`POST /admin/jobs/check-overdue-slas`).</li><li>View high-level platform statistics and audit log timeline with filtering.</li><li>View platform-wide payment and subscription history (`GET /admin/payments`).</li><li>Soft-delete complaints if required.</li></ul> |

---

## 🛠️ Tech Stack

| Component | Technology | Version / Purpose |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org) | `24.x` (enforced via `.node-version`) |
| **Language** | [TypeScript](https://www.typescriptlang.org) | `5.6.x` (strict type safety) |
| **Web Framework** | [Express](https://expressjs.com) | `4.21.x` |
| **Database** | [PostgreSQL](https://www.postgresql.org) | Relational persistence with foreign keys & indexes |
| **ORM** | [Prisma](https://www.prisma.io) | `5.22.x` with multi-file schema architecture |
| **Payments** | [Stripe](https://stripe.com) | `22.6.x` (Checkout sessions, customer portal, webhooks) |
| **Authentication** | JWT & Google OAuth | `jsonwebtoken` 9.x, `google-auth-library` 11.x, `bcrypt` 6.x |
| **File Storage** | [Cloudinary](https://cloudinary.com) | Cloud image storage via `multer` 2.x |
| **Validation** | [Zod](https://zod.dev) | Schema parsing for bodies and queries |
| **Rate Limiting** | [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | Tiered IP-based window rate limiting |
| **Scheduling** | [node-cron](https://github.com/node-cron/node-cron) | Hourly automated SLA monitoring jobs |
| **Security** | Helmet, CORS, Cookie-Parser | Hardened HTTP headers, cross-site cookies, origin whitelist |
| **API Docs** | Swagger & Postman | OpenAPI 3.0 via `swagger-jsdoc` & `openapi-to-postmanv2` |
| **Tooling** | [Biome](https://biomejs.dev) | Fast linting and formatting |

---

## 🏗️ Architecture

### Directory Layout

```text
City-Complaint-Platform/
├── .node-version                     # Target Node runtime (24)
├── package.json                      # Scripts and dependencies
├── biome.json                        # Biome linter & formatter configuration
├── render.yaml                       # Reference Render dashboard specification
├── DEPLOYMENT.md                     # Manual Render deployment playbook
├── postman/
│   └── City-Complaint-Platform.postman_collection.json # Generated Postman collection
├── prisma/
│   ├── seed-data.ts                  # Shared department & category definitions
│   ├── seed.ts                       # Full development & demo seeder
│   ├── seed.prod.ts                  # Idempotent create-only production seeder
│   └── schema/                       # Multi-file Prisma schema configuration
│       ├── config.prisma             # Datasource and generator configuration
│       ├── enums.prisma              # Platform enumerations (Roles, Statuses, Priority)
│       ├── user.prisma               # User model & relationships
│       ├── refreshToken.prisma       # Hashed refresh token store
│       ├── department.prisma         # Municipal departments
│       ├── category.prisma           # Service categories with SLA hours
│       ├── complaint.prisma          # Complaint records & lifecycle fields
│       ├── attachment.prisma         # Cloudinary file attachments
│       ├── review.prisma             # Immutable citizen reviews & ratings
│       ├── notification.prisma       # In-app notifications
│       ├── subscription.prisma       # Stripe subscription tracking
│       ├── payment.prisma            # Stripe transaction & invoice history
│       └── auditLog.prisma           # Immutable platform audit trail
├── scripts/
│   ├── generate-postman.ts           # OpenAPI-to-Postman conversion script
│   └── validate-docs.ts              # Documentation integrity validator
└── src/
    ├── server.ts                     # HTTP server startup (0.0.0.0), cron, graceful shutdown
    ├── app.ts                        # Express middleware chain, CORS, rate limits, routes
    ├── config/                       # Configuration providers
    │   ├── env.ts                    # Hardened environment variable validation
    │   ├── prisma.ts                 # Shared Prisma Client instance
    │   ├── stripe.ts                 # Stripe client initialization
    │   ├── cloudinary.ts             # Cloudinary SDK initialization
    │   └── swagger.ts                # JSDoc OpenAPI specification builder
    ├── jobs/                         # Background cron jobs
    │   ├── checkOverdueSla.job.ts    # Overdue SLA scanner & notifier
    │   └── scheduler.ts              # node-cron scheduler registration
    ├── middlewares/                  # Express middleware
    │   ├── auth.middleware.ts        # JWT authentication & RBAC authorization
    │   ├── errorHandler.ts           # Global error handler with CustomError mapping
    │   ├── notFound.ts               # 404 handler
    │   ├── rateLimit.middleware.ts   # Tiered IP rate limiters
    │   ├── upload.middleware.ts      # Multer memory storage & file type filter
    │   └── validate.ts               # Zod validation middleware
    ├── modules/                      # Domain feature modules
    │   ├── admin/                    # Platform administration & audit logs
    │   ├── attachments/              # Cloudinary upload & attachment management
    │   ├── auth/                     # Auth, registration, token refresh, cookies
    │   ├── categories/               # Department service category CRUD
    │   ├── complaints/               # Complaint lifecycle, assignment, queries
    │   ├── departments/              # Department public listing & admin CRUD
    │   ├── notifications/            # In-app notification inbox & read tracking
    │   ├── payments/                 # Stripe checkout, webhooks, cancellations
    │   ├── reviews/                  # Reviews, technician ratings
    │   ├── staffApplications/        # Staff role upgrade approvals
    │   └── users/                    # User profile & password management
    ├── routes/
    │   └── index.ts                  # Central API v1 router mounting
    ├── types/                        # TypeScript declaration merges
    └── utils/                        # Sanitization & standardized response builders
```

### Modular Design Pattern
Each domain feature lives in `src/modules/<feature>/` following a clear 4-layer separation of concerns:
1. `*.validation.ts`: Zod schemas for incoming payloads and queries.
2. `*.service.ts`: Business logic, Prisma database operations, external integrations.
3. `*.controller.ts`: HTTP request/response orchestration, status codes, standard JSON payloads.
4. `*.routes.ts`: Route declarations, JSDoc `@swagger` documentation annotations, route-level middlewares.

---

## 🔄 Complaint Status Workflow

The complaint lifecycle is strictly enforced by `complaint.service.ts` using atomic database transactions and transition state validation:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Citizen creates complaint (slaDueAt set)
    
    PENDING --> ASSIGNED: Manager/Admin assigns Technician
    PENDING --> REJECTED: Manager/Admin rejects (reason required)
    PENDING --> CANCELLED: Citizen cancels (owner only)
    
    ASSIGNED --> IN_PROGRESS: Assigned Technician starts work
    
    IN_PROGRESS --> RESOLVED: Assigned Technician resolves (note required, resolvedAt set)
    
    RESOLVED --> CLOSED: Manager/Admin closes work order
    RESOLVED --> IN_PROGRESS: Manager/Admin reopens (reason required)
    
    CLOSED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

### Transition Authority Rules
- **`PENDING → ASSIGNED`**: Department Manager or Admin. Technician must belong to the complaint's department.
- **`PENDING → REJECTED`**: Department Manager or Admin. A rejection note is mandatory and notifies the citizen.
- **`PENDING → CANCELLED`**: Citizen owner only while the status is still `PENDING`.
- **`ASSIGNED → IN_PROGRESS`**: Assigned Technician only.
- **`IN_PROGRESS → RESOLVED`**: Assigned Technician only. Requires a resolution note and records `resolvedAt`.
- **`RESOLVED → CLOSED`**: Department Manager or Admin after confirming satisfactory resolution.
- **`RESOLVED → IN_PROGRESS`**: Department Manager or Admin if work is unsatisfactory. Requires a reopen reason and notifies the assigned technician.

### Background SLA Overdue Scanner
- A cron worker (`src/jobs/checkOverdueSla.job.ts`) runs every hour (`0 * * * *`).
- Queries active complaints (`PENDING`, `ASSIGNED`, `IN_PROGRESS`) where `slaDueAt < NOW()` and `overdueNotifiedAt IS NULL`.
- Dispatches `SLA_OVERDUE` in-app notifications to all Managers in the complaint's department and timestamps `overdueNotifiedAt` to prevent duplicate alerts.
- Admins can also trigger this check on demand via `POST /api/v1/admin/jobs/check-overdue-slas`.

---

## 🔒 Authentication & Security

- **Dual-Token JWT Architecture:**
  - **Access Token:** Short-lived (default 15 minutes), signed with `JWT_ACCESS_SECRET`, transmitted via HTTP `Authorization: Bearer <token>`.
  - **Refresh Token:** Long-lived (default 7 days), signed with `JWT_REFRESH_SECRET`, stored hashed (SHA-256) in the database (`RefreshToken` table) to support token rotation and instant revocation on logout.
- **Cross-Site Cookie Handling:**
  - Refresh tokens are transmitted in an `httpOnly` cookie (`refreshToken`).
  - In `production`: Configured with `SameSite: "none"` and `Secure: true`, allowing the upcoming separate frontend domain (e.g. Next.js on Vercel) to maintain authenticated sessions without third-party cookie blocking.
  - In `development`: Configured with `SameSite: "strict"` and `Secure: false`.
- **Google OAuth Integration:**
  - Verifies Google ID tokens via `google-auth-library`.
  - Automatically matches existing accounts by verified email or provisions a new citizen profile.
- **Staff Approval Workflow:**
  - Self-registration is restricted to the `CITIZEN` role.
  - Users requesting `TECHNICIAN` or `MANAGER` roles are placed in `approvalStatus: PENDING`.
  - Technician requests are reviewed by Department Managers; Manager requests are reviewed by Admins.
- **Tiered Rate Limiting (`express-rate-limit`):**
  - `globalLimiter`: 300 requests / 15 minutes per IP (applied globally after the webhook route; skips `/api/v1/health`).
  - `authLimiter`: 10 requests / 15 minutes per IP (`POST /auth/login`, `/auth/register`, `/auth/google`).
  - `refreshLimiter`: 30 requests / 15 minutes per IP (`POST /auth/refresh-token`).
  - `checkoutLimiter`: 10 requests / 15 minutes per IP (`POST /payments/checkout-session`, `/confirm-session`).
  - Returns standard HTTP 429 `{ "success": false, "message": "Too many requests, please try again later." }`.
  - Can be bypassed in tests or via `RATE_LIMIT_DISABLED=true`.
- **CORS Protection:**
  - Dynamic allowlist generated from `APP_BASE_URL`, `FRONTEND_BASE_URL`, and `ALLOWED_ORIGINS`.
  - Unauthorized origins return HTTP 403 `{ "success": false, "message": "Origin not allowed by CORS" }`.
  - Requests without origin headers (cURL, mobile apps, Stripe webhooks) continue to pass.
- **Staff Invitations & Forced Password Change:**
  - Managers can invite technicians into their own department (`POST /departments/my/technicians`).
  - Administrators can invite technicians or managers into any department (`POST /admin/staff`).
  - A secure, 12-character temporary password satisfying all complexity requirements is generated and hashed.
  - Accounts are provisioned with `mustChangePassword: true` and a 7-day expiration (`tempPasswordExpiresAt`).
  - An email with teal/violet responsive branding is dispatched containing login instructions and the temporary password.
  - Upon logging in with an unexpired temporary password, the `authenticate` middleware strictly locks the user session: they are permitted to access only `GET /users/me`, `POST/PATCH /users/me/password`, `POST /auth/logout`, and `POST /auth/refresh-token`. All other endpoints return HTTP 403 with `code: "PASSWORD_CHANGE_REQUIRED"`.
  - Calling `POST/PATCH /users/me/password` successfully resets `mustChangePassword` to `false`, revokes active refresh tokens, dispatches a security notification email, and writes an audit log.
- **Transactional Email Delivery (Brevo HTTPS API):**
  - **SMTP Port Blocking on Render:** Render's free tier restricts outbound SMTP ports (25, 465, 587). The platform intentionally avoids SMTP and Nodemailer, using Brevo's HTTPS transactional API (`POST https://api.brevo.com/v3/smtp/email`) via native `fetch` with a 10-second `AbortController` timeout.
  - **Graceful Local Fallback:** When `BREVO_API_KEY` is omitted in non-production environments (`NODE_ENV !== "production"`), outgoing emails are logged to the console without crashing or failing requests, facilitating seamless local development.
- **Audit Logging & Soft Deletes:**
  - Critical actions (complaint status transitions, user role changes, staff invitations, technician removals, account deactivations) create immutable records in `AuditLog`.
  - Deletions across users, departments, categories, and complaints use `deletedAt` timestamps to preserve referential integrity.

---

## 💳 Stripe Payments & Subscriptions

Citizens can subscribe to a premium tier to receive priority complaint handling.

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant Client as Frontend / Postman
    participant API as Platform API
    participant Stripe as Stripe Gateway
    participant DB as PostgreSQL

    Citizen->>Client: Click "Upgrade to Premium"
    Client->>API: POST /api/v1/payments/checkout-session
    API->>Stripe: Create Checkout Session (mode: subscription)
    Stripe-->>API: Return Checkout URL & Session ID
    API-->>Client: { checkoutUrl: "https://checkout.stripe.com/..." }
    Client->>Stripe: Complete payment with card
    
    par Async Webhook
        Stripe->>API: POST /api/v1/payments/webhook (checkout.session.completed)
        API->>DB: Upsert Subscription (ACTIVE) & Payment record
        API->>DB: Set User.isPremium = true
        API-->>Stripe: 200 OK
    and Sync Fallback
        Client->>API: POST /api/v1/payments/confirm-session { sessionId }
        API->>Stripe: Retrieve session details
        API->>DB: Activate subscription immediately
        API-->>Client: 200 OK { isPremium: true }
    end
```

### Webhook Events Handled
The raw webhook endpoint (`POST /api/v1/payments/webhook`) processes the following signed Stripe events idempotently:
1. `checkout.session.completed`: Activates subscription, marks `user.isPremium = true`, creates a payment transaction.
2. `customer.subscription.updated`: Synchronizes status changes (`active`, `past_due`, `canceled`).
3. `customer.subscription.deleted`: Marks subscription `CANCELED`, sets `user.isPremium = false`.
4. `invoice.payment_succeeded`: Records recurring invoice payment, ensures active premium status.
5. `invoice.payment_failed`: Records failed invoice payment, marks subscription `PAST_DUE`, revokes premium privileges.

### Local Testing with Stripe CLI
1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Log in to your Stripe test account:
   ```bash
   stripe login
   ```
3. Forward webhook events to your local API port:
   ```bash
   stripe listen --forward-to localhost:3000/api/v1/payments/webhook
   ```
4. Copy the printed webhook signing secret (`whsec_...`) into your `.env` as `STRIPE_WEBHOOK_SECRET`.
5. Test payments in the checkout session using the official Stripe test card:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiration:** Any future date (e.g. `12/34`)
   - **CVC:** Any 3 digits (e.g. `123`)
   - **ZIP:** Any valid format (e.g. `90210`)

---

## 📡 API Endpoint Overview

All routes are mounted under `/api/v1` (except the root discovery route and Swagger UI). Standard JSON response envelope: `{ "success": boolean, "message": string, "data"?: any, "errors"?: any }`.

### 1. System & Health
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/` | Public | API root discovery with links to docs and health |
| `GET` | `/api/v1/health` | Public | Server uptime and health verification |

### 2. Public Portal (`/api/v1/public`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/public/departments` | Public | List active departments (cached 5 min, `Cache-Control: public, max-age=300`) |
| `GET` | `/public/departments/:id/technicians` | Public | List active technicians with rating and review count only (no emails/phones) |
| `GET` | `/public/categories` | Public | List active categories and SLA target hours (cached 5 min) |
| `GET` | `/public/stats` | Public | Total complaints, resolved count, resolution rate, and avg hours (cached 5 min) |
| `GET` | `/public/premium-info` | Public | Premium subscription benefits and live Stripe pricing (cached 5 min) |
| `GET` | `/public/overview` | Public | Full landing page overview (highlights, workflow, roles, plans, FAQs, live stats, cached 5 min) |

### 3. Authentication (`/api/v1/auth`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public (10/15m) | Register a citizen or submit staff application |
| `POST` | `/auth/login` | Public (10/15m) | Email & password login; sets refresh cookie |
| `POST` | `/auth/google` | Public (10/15m) | Sign in with verified Google OAuth ID token |
| `POST` | `/auth/refresh-token` | Public (30/15m) | Rotates refresh token and issues new access token |
| `POST` | `/auth/logout` | Authenticated | Revokes refresh token in DB and clears cookie |

### 4. Users (`/api/v1/users`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/users/me` | Authenticated | Fetch current user profile (includes `mustChangePassword`) |
| `PATCH` | `/users/me` | Authenticated | Update profile (name, phone, avatar) |
| `POST` / `PATCH` | `/users/me/password` | Authenticated | Change password, clear temporary password requirement, and invalidate existing refresh tokens |

### 5. Staff Applications (`/api/v1/staff-applications`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/staff-applications` | `MANAGER`, `ADMIN` | List pending staff applications (scoped by dept) |
| `PATCH` | `/staff-applications/:id` | `MANAGER`, `ADMIN` | Approve or reject a staff promotion application |

### 6. Complaints (`/api/v1/complaints`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/complaints/usage` | `CITIZEN` | Check monthly complaint quota, used count, and reset date |
| `POST` | `/complaints` | `CITIZEN` | Create a new complaint (subject to monthly limit: 5 free, 20 premium) |
| `GET` | `/complaints` | Authenticated | List complaints (scoped by role & department) |
| `GET` | `/complaints/search` | Authenticated | Full-text search across visible complaints |
| `GET` | `/complaints/my-assigned` | `TECHNICIAN` | List complaints assigned to the calling technician |
| `GET` | `/complaints/:id` | Authenticated | Get complaint details (scoped by access permissions) |
| `PATCH` | `/complaints/:id` | Authenticated | Citizen edits details or Manager re-triages priority |
| `POST` | `/complaints/:id/assign` | `MANAGER`, `ADMIN` | Assign a technician from the same department (guard on availability) |
| `PATCH` | `/complaints/:id/status` | Authenticated | Perform a validated complaint status transition |
| `PATCH` | `/complaints/:id/reopen` | `CITIZEN` | Reopen personal resolved complaint within reopen window |
| `PATCH` | `/complaints/:id/escalate` | `MANAGER` | Escalate department complaint to central admin queue |
| `POST` | `/complaints/:id/cancel` | `CITIZEN` | Cancel personal complaint while in `PENDING` |
| `DELETE` | `/complaints/:id` | `ADMIN` | Soft-delete a complaint record |

### 6. Attachments
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/complaints/:complaintId/attachments` | Authenticated | Upload up to 10 image files to Cloudinary |
| `GET` | `/complaints/:complaintId/attachments` | Authenticated | List all attachments for a complaint |
| `DELETE` | `/attachments/:id` | Authenticated | Delete an attachment (uploader or admin only) |

### 7. Departments (`/api/v1/departments` & `/api/v1/admin/departments`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/departments` | Public | Public listing of active departments |
| `GET` | `/departments/my/technicians` | `MANAGER` | List technicians in manager's department (with `invitePending` and rating) |
| `POST` | `/departments/my/technicians` | `MANAGER` (20/15m) | Invite technician to manager's department with temporary password |
| `DELETE` | `/departments/my/technicians/:id` | `MANAGER` | Remove technician from department (blocked with 409 if active complaints exist) |
| `POST` | `/departments/my/technicians/:id/resend-invite` | `MANAGER` (20/15m) | Resend invitation email with new temporary password to technician |
| `GET` | `/admin/departments` | `ADMIN` | List all departments (including deleted if requested) |
| `POST` | `/admin/departments` | `ADMIN` | Create a new municipal department |
| `GET` | `/admin/departments/:id` | `ADMIN` | Get department details and its active categories |
| `PATCH` | `/admin/departments/:id` | `ADMIN` | Update department name and description |
| `DELETE` | `/admin/departments/:id` | `ADMIN` | Soft-delete department (fails if active complaints exist) |

### 8. Service Categories (`/api/v1/admin`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/admin/departments/:departmentId/categories` | `ADMIN` | List service categories for a department |
| `POST` | `/admin/departments/:departmentId/categories` | `ADMIN` | Create category with target `slaHours` |
| `PATCH` | `/admin/categories/:id` | `ADMIN` | Update category details and SLA duration |
| `DELETE` | `/admin/categories/:id` | `ADMIN` | Soft-delete category (blocked if active complaints exist) |

### 9. Reviews & Ratings
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/complaints/:complaintId/review` | `CITIZEN` | Submit immutable 1-5 star review for resolved complaint |
| `GET` | `/complaints/:complaintId/review` | Authenticated | Get review details for a complaint |
| `GET` | `/technicians/:id/rating` | Authenticated | View aggregated average rating & review count for technician |

### 10. Notifications (`/api/v1/notifications`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/notifications` | Authenticated | Paginated in-app notification inbox |
| `PATCH` | `/notifications/:id/read` | Authenticated | Mark a single notification as read |
| `PATCH` | `/notifications/read-all` | Authenticated | Mark all notifications as read |

### 11. Technicians (`/api/v1/technicians`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `PATCH` | `/technicians/me/availability` | `TECHNICIAN` | Update technician availability for complaint assignment |
| `GET` | `/technicians/me/performance` | `TECHNICIAN` | Live computed performance metrics (assigned, resolved, overdue, ratings) |

### 12. Payments & Subscriptions (`/api/v1/payments`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/payments/checkout-session` | `CITIZEN` (10/15m) | Create a Stripe recurring checkout session |
| `POST` | `/payments/confirm-session` | `CITIZEN` (10/15m) | Manually sync and verify session payment status |
| `POST` | `/payments/cancel` | `CITIZEN` | Schedule subscription cancellation at period end |
| `GET` | `/payments/subscription` | Authenticated | View current active subscription status |
| `GET` | `/payments/:id` | Authenticated | Get specific payment record details |
| `POST` | `/payments/webhook` | Stripe (Unthrottled)| Raw webhook listener verifying Stripe signature |

### 13. Administration (`/api/v1/admin`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/admin/users` | `ADMIN` | Paginated user directory with role, status, and `mustChangePassword` filtering |
| `POST` | `/admin/staff` | `ADMIN` (20/15m) | Invite technician or manager to any active department with temporary password |
| `POST` | `/admin/staff/:id/resend-invite` | `ADMIN` (20/15m) | Resend invitation email with new temporary password to a staff user |
| `PATCH` | `/admin/users/:id/role` | `ADMIN` | Override user role & department assignment |
| `PATCH` | `/admin/users/:id/deactivate` | `ADMIN` | Deactivate account (guarded against last admin) |
| `PATCH` | `/admin/users/:id/reactivate` | `ADMIN` | Reactivate a deactivated account |
| `GET` | `/admin/dashboard-stats` | `ADMIN` | Platform statistics (complaints by status, overdue, tech loads) |
| `GET` | `/admin/audit-logs` | `ADMIN` | Paginated audit trail with actor and entity filters |
| `GET` | `/admin/escalated-complaints` | `ADMIN` | Paginated escalated complaint queue (oldest first) |
| `PATCH` | `/admin/complaints/:id/clear-escalation` | `ADMIN` | Clear complaint escalation status with optional audit note |
| `GET` | `/admin/premium-pricing` | `ADMIN` | View Stripe subscription price and recurring plan metadata |
| `POST` | `/admin/jobs/check-overdue-slas` | `ADMIN` | Trigger manual on-demand overdue SLA scan |
| `GET` | `/admin/payments` | `ADMIN` | Paginated subscription list with user info and payment history |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** `24.x` (see `.node-version`)
- **PostgreSQL:** Running locally or hosted (e.g. Supabase, Neon)
- **Cloudinary Account:** For image attachment storage
- **Stripe Account:** In test mode with recurring price ID created

### 1. Clone & Install
```bash
git clone https://github.com/Fahim7600/City-Complaint-Platform.git
cd City-Complaint-Platform
npm install
```

### 2. Environment Configuration
Copy the template and configure your local settings:
```bash
cp .env.example .env
```

| Variable | Required? | Description | Example Placeholder |
|---|---|---|---|
| `PORT` | Optional | Port for the HTTP server (defaults to 3000) | `3000` |
| `DATABASE_URL` | **Required** | PostgreSQL connection string with schema | `postgresql://user:pass@localhost:5432/city_db?schema=public` |
| `NODE_ENV` | Optional | Runtime environment (`development`, `production`, `test`) | `development` |
| `APP_BASE_URL` | **Required** | Public origin of the backend API | `http://localhost:3000` |
| `FRONTEND_BASE_URL` | Optional | Origin of the frontend application for CORS | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS whitelist (`*` allowed in dev) | `http://localhost:3000,http://localhost:5173` |
| `ADMIN_SEED_EMAIL` | **Required (Seed)** | Admin email used during database seed | `admin@example.com` |
| `ADMIN_SEED_PASSWORD` | **Required (Seed)** | Admin password (min 10 chars) | `SuperAdminPassword123!` |
| `DEMO_USERS_PASSWORD` | **Required (Dev Seed)** | Universal password for all generated demo staff | `StaffDemoPassword456!` |
| `JWT_ACCESS_SECRET` | **Required (Prod)** | Secret key for access token signing (min 32 chars in prod) | `test_jwt_access_secret_min_32_chars_long` |
| `JWT_REFRESH_SECRET` | **Required (Prod)** | Secret key for refresh token signing (min 32 chars, distinct) | `test_jwt_refresh_secret_min_32_chars_long` |
| `JWT_ACCESS_EXPIRY` | Optional | Access token expiration duration | `15m` |
| `JWT_REFRESH_EXPIRY` | Optional | Refresh token expiration duration | `7d` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID | `your-google-client-id.apps.googleusercontent.com` |
| `CLOUDINARY_CLOUD_NAME`| **Required** | Cloudinary account cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | **Required** | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET`| **Required** | Cloudinary API Secret | `your_cloudinary_api_secret` |
| `STRIPE_SECRET_KEY` | **Required** | Stripe Secret Key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET`| **Required** | Stripe Webhook Signing Secret | `whsec_...` |
| `STRIPE_PREMIUM_PRICE_ID`| **Required** | Stripe recurring Price ID for premium plan | `price_...` |
| `BREVO_API_KEY` | Optional (Prod Required) | Brevo HTTPS API key for transactional emails | `xkeysib-...` |
| `MAIL_FROM_EMAIL` | Optional | Transactional email sender address (defaults to `noreply@cityfix.local`) | `noreply@citycomplaints.com` |
| `MAIL_FROM_NAME` | Optional | Transactional email sender display name (defaults to `CityFix`) | `CityFix Municipal Services` |
| `REOPEN_WINDOW_DAYS` | Optional | Reopen window duration in days (defaults to 7) | `7` |
| `MONTHLY_COMPLAINT_LIMIT_FREE` | Optional | Monthly complaint cap for free tier citizens (defaults to 5) | `5` |
| `MONTHLY_COMPLAINT_LIMIT_PREMIUM` | Optional | Monthly complaint cap for premium tier citizens (defaults to 20) | `20` |
| `RATE_LIMIT_DISABLED` | Optional | Set to `true` to disable rate limiting in dev/test | `false` |

### 3. Database Migration & Seeding
```bash
# Apply Prisma migrations to the database
npx prisma migrate dev

# Seed departments, categories, and test accounts
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:3000`. You can explore the interactive API documentation at:
`http://localhost:3000/api-docs`

---

## 📜 Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `ts-node-dev --respawn --transpile-only src/server.ts` | Start local server with hot reloading |
| `npm run build` | `prisma generate && tsc` | Generate Prisma client and compile TypeScript to `dist/` |
| `npm start` | `node dist/server.js` | Run compiled production build |
| `npm run lint` | `biome check .` | Run Biome linter across all project files |
| `npm run format` | `biome format --write .` | Format code according to Biome standards |
| `npm run seed` | `prisma db seed` | Run `prisma/seed.ts` (creates admin, departments, demo staff) |
| `npm run seed:prod` | `tsx prisma/seed.prod.ts` | Idempotent create-only production seeder |
| `npm run render:build` | `npm ci --include=dev && npx prisma migrate deploy && npm run build && npm run seed:prod` | Automated Render build pipeline |
| `npm run generate:postman` | `tsx scripts/generate-postman.ts` | Convert OpenAPI specification into Postman collection |
| `npm run validate:docs` | `tsx scripts/validate-docs.ts` | Validate route count & Postman collection integrity |

---

## 🧪 Demo Credentials

When running `npm run seed` in development, accounts are generated from `prisma/seed-data.ts`. Passwords are **never hardcoded in code**; they are hashed dynamically using the environment variables in your `.env`:

- **Administrator:**
  - **Email:** Value of `ADMIN_SEED_EMAIL` (e.g. `admin@citycomplaints.com`)
  - **Password:** Value of `ADMIN_SEED_PASSWORD`
- **Department Managers & Technicians:**
  - **Password:** Value of `DEMO_USERS_PASSWORD` for all accounts below:

| Role | Department | Email |
|---|---|---|
| **Manager** | Roads & Infrastructure | `manager.roads@citycomplaints.com` |
| **Technician** | Roads & Infrastructure | `tech1.roads@citycomplaints.com` |
| **Technician** | Roads & Infrastructure | `tech2.roads@citycomplaints.com` |
| **Manager** | Water Supply & Sewage | `manager.water@citycomplaints.com` |
| **Technician** | Water Supply & Sewage | `tech1.water@citycomplaints.com` |
| **Technician** | Water Supply & Sewage | `tech2.water@citycomplaints.com` |
| **Manager** | Waste Management & Sanitation | `manager.waste@citycomplaints.com` |
| **Technician** | Waste Management & Sanitation | `tech1.waste@citycomplaints.com` |
| **Technician** | Waste Management & Sanitation | `tech2.waste@citycomplaints.com` |

---

## ☁️ Deployment

The backend is configured for deployment on [Render](https://render.com) as a manual Web Service.

- **Runtime:** Node.js (Version `24`)
- **Build Command:** `npm run render:build`
  - Installs devDependencies via `npm ci --include=dev` (required because Prisma and TypeScript compile during build).
  - Deploys database migrations (`npx prisma migrate deploy`).
  - Generates Prisma client and compiles TypeScript (`npm run build`).
  - Executes create-only idempotent production seed (`npm run seed:prod`).
- **Start Command:** `npm start`
- **Health Check Path:** `/api/v1/health`

For step-by-step instructions (including Stripe webhook setup and separate frontend domain wiring), consult [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 📚 API Documentation & Postman

1. **Interactive Swagger UI:**
   Access `/api-docs` on your local or hosted instance (`http://localhost:3000/api-docs`). All schemas, request bodies, and role-based responses are documented.
2. **Postman Collection:**
   The repository includes a pre-generated, validated Postman v2 collection located at:
   [`postman/City-Complaint-Platform.postman_collection.json`](./postman/City-Complaint-Platform.postman_collection.json)
3. **Regenerating & Validating Documentation:**
   When adding or updating endpoints, keep documentation in sync with:
   ```bash
   # Rebuild Postman collection from OpenAPI tags
   npm run generate:postman

   # Verify documentation operation count and Postman validity
   npm run validate:docs
   ```

---

## ⚠️ Known Limitations & Roadmap

- **In-Memory Rate Limiting:** Rate limiting uses in-memory tracking via `express-rate-limit`. For horizontal scaling across multiple web dynos, a Redis-backed store (`rate-limit-redis`) is recommended.
- **Polling vs. Realtime:** In-app notifications and complaint status changes are tracked via REST polling. Future phases will introduce a WebSockets or Server-Sent Events (SSE) notification bridge.
- **GIS Geocoding:** Location data is currently captured as descriptive strings; future roadmaps plan GeoJSON integration with PostGIS spatial coordinates for municipal heat-maps.

---

## 📄 License & Author

- **Author:** City Complaint Platform Engineering Team
- **License:** [MIT](LICENSE)
