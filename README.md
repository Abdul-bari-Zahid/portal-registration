# Secure Event Registration & QR Ticket Management Portal

A production-ready, enterprise-grade Event Registration and QR Ticket Management Portal built with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js) and Tailwind CSS.

Designed with a **Security-First Architecture**, implementing atomic one-time QR scanning, single-admin constraints, private storage streams for payment verification, binary magic-byte upload inspection, and cryptographic audit trails.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [Security Architecture](#-security-architecture)
3. [Technology Stack](#-technology-stack)
4. [Project Structure](#-project-structure)
5. [Prerequisites & Environment Variables](#-prerequisites--environment-variables)
6. [Quick Start & Setup Instructions](#-quick-start--setup-instructions)
7. [Running the Application](#-running-the-application)
8. [Automated Testing Suite](#-automated-testing-suite)
9. [API Documentation](#-api-documentation)
10. [Production Deployment Guide](#-production-deployment-guide)

---

## 🌟 Key Features

### 1. Public Attendee Registration
- Responsive, modern registration form with live validation for Name, Email, Department, and Phone Number.
- Payment screenshot upload with drag-and-drop, client-side preview, file size limits, and deep binary magic byte verification.
- Duplicate submission prevention based on email and phone numbers.
- Unique Human-Readable Registration ID generation (`REG-2026-XXXXXX`).
- Post-submission confirmation clearly notifying attendees that payments are pending admin verification.
- **Strict Security Rule:** Does *NOT* generate or reveal a QR ticket immediately upon registration.

### 2. Single Master Admin Authentication
- **Strict Single-Admin Model:** System permits strictly ONE administrator account. Creation of duplicate admin accounts is blocked at both model and controller levels.
- Pre-seeded via environment variables or secure one-time setup.
- Passwords hashed with bcrypt (cost factor 12).
- Session tokens transmitted via signed, `HttpOnly`, `SameSite=Strict` cookies.
- Brute-force protection via IP rate-limiting.
- Protected session verification (`/api/auth/me`).

### 3. Manual Payment Verification & Approval Workflow
- Dedicated review modal displaying attendee information alongside payment proof.
- **Private Image Storage Stream:** Payment screenshots are quarantined outside public web directories. Only authenticated administrators can view or stream payment proofs (`/api/registrations/:id/payment-proof`).
- **Approve Payment:** Updates payment status to `APPROVED`, atomically generates a unique QR Ticket ID (`TCK-2026-XXXXXX`), generates a 256-bit cryptographically unpredictable token, stores only its SHA-256 hash in the database, and marks the pass as `ISSUED`.
- **Reject Payment:** Requires a mandatory rejection reason, sets status to `REJECTED`, and permanently blocks ticket generation.

### 4. High-Resolution Digital QR Ticket Generation & Distribution
- **Privacy-Preserving QR:** QR codes contain **ONLY** an opaque, unpredictable 256-bit cryptographic token. No attendee names, emails, phones, or payment data are embedded inside the barcode.
- High-contrast, printable event ticket layout:
  - **Left Section:** Event branding, Attendee Name, Registration ID, Ticket ID, Department, Email, Phone, Verified Status.
  - **Right Section:** High-density QR code with "SCAN FOR ENTRY" guide.
  - **Bottom Section:** Single-entry notice, issue timestamp, venue details.
- PDF generation (server-side streaming via PDFKit and client-side vector download via jsPDF/html2canvas).
- Manual distribution tracking: `NOT_SENT` vs `SENT` with timestamps and quick-copy email shortcuts.

### 5. Atomic One-Time QR Code Scanner
- Dedicated camera scanner supporting mobile back/rear camera and desktop webcams.
- Device selection dropdown and manual fallback input.
- **Atomic Database Concurrency Guarantee:** Scanning is enforced directly on the backend using an atomic MongoDB conditional operation:
  ```javascript
  const scannedTicket = await Ticket.findOneAndUpdate(
    { qrTokenHash: { $in: queryHashes }, ticketStatus: 'ISSUED', isScanned: false },
    { $set: { ticketStatus: 'SCANNED', isScanned: true, scannedAt: currentTimestamp } },
    { new: true, returnDocument: 'after' }
  ).populate('registrationId');
  ```
- **Guaranteed Race Condition Immunity:** If two gate scanners scan the identical QR code at the exact same millisecond, only the first operation succeeds (`ENTRY SUCCESSFUL`). The second immediately receives `ALREADY SCANNED` along with the original scan timestamp.
- Audio chimes and visual alerts for Valid Entry, Already Scanned, Invalid QR, and Revoked passes.

### 6. Executive Dashboard & Audit Trail
- 7 live metric cards: Total Registrations, Pending Payments, Approved Payments, Rejected Payments, Total Tickets Generated, Total Scanned Tickets, Remaining Entries.
- Immutable Security Audit Log recording all critical events: Logins, Approvals, Rejections, Scans, Revocations, and IP addresses.

---

## 🔒 Security Architecture

| Security Domain | Implementation |
| :--- | :--- |
| **Authentication** | JWT stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies |
| **Single Admin** | Pre-save schema count enforcement + unique index on Admin collection |
| **Password Security** | Bcrypt with 12 salt rounds |
| **File Upload Defense**| Binary magic bytes header inspection (`89 50 4E 47` for PNG, `FF D8 FF` for JPEG, `RIFF...WEBP` for WebP). Spoofed file extensions are deleted immediately |
| **Quarantine Storage** | Files saved in private local folder (`private_uploads/`), served strictly through authenticated streaming routes with `X-Content-Type-Options: nosniff` |
| **Anti-Brute Force** | Multi-tier `express-rate-limit` (Login: 6 req/15min, Registration: 20 req/hr, Scanner: 120 req/min) |
| **HTTP Hardening** | `helmet` security headers, strict CORS origin allowlist |
| **Atomic QR Scan** | MongoDB conditional `$set` ensures race-condition immunity |
| **Data Privacy** | Barcodes contain strictly SHA-256 hashed unpredictable tokens |

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 18 / Vite
- **Styling:** Tailwind CSS (Modern dark theme, responsive grid layouts)
- **Icons:** Lucide React
- **Routing:** React Router v7
- **HTTP Client:** Axios (configured with `withCredentials: true`)
- **QR Scanning:** `html5-qrcode` (multi-camera detection, mobile environment sensor)
- **PDF Generation:** `jspdf` & `html2canvas`

### Backend
- **Runtime:** Node.js (v20+ / v24)
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Authentication:** `jsonwebtoken`, `bcryptjs`, `cookie-parser`
- **File Processing:** `multer` (with custom binary signature inspection)
- **PDF Engine:** `pdfkit`
- **QR Generation:** `qrcode` (high error-correction mode)
- **Testing:** Native Node Test Runner (`node:test`, `node:assert`) + `supertest` + `mongodb-memory-server`

---

## 📂 Project Structure

```text
├── backend/
│   ├── private_uploads/           # Private quarantine folder for payment proofs
│   ├── src/
│   │   ├── config/
│   │   │   ├── config.js          # Centralized environment configuration
│   │   │   └── db.js              # MongoDB Atlas & in-memory connection manager
│   │   ├── controllers/
│   │   │   ├── authController.js          # Admin login, logout, session verification
│   │   │   ├── registrationController.js  # Registration submit, query, private file stream
│   │   │   ├── paymentController.js       # Manual approval & rejection workflows
│   │   │   ├── ticketController.js        # Ticket queries, distribution, revocation, PDF
│   │   │   ├── scannerController.js       # Atomic QR verification & scan tracking
│   │   │   ├── dashboardController.js     # Statistical aggregation & telemetry
│   │   │   └── auditController.js         # Security audit log queries
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js          # Admin token & cookie verification
│   │   │   ├── uploadMiddleware.js        # Multer diskStorage & binary byte validator
│   │   │   ├── rateLimiter.js             # Layered rate limiters
│   │   │   ├── validationMiddleware.js    # Express-validator error formatter
│   │   │   └── errorMiddleware.js         # Centralized error & 404 handlers
│   │   ├── models/
│   │   │   ├── Admin.js                   # Admin model (single account constraint)
│   │   │   ├── Registration.js            # Registration model with compound indexes
│   │   │   ├── Ticket.js                  # Ticket model with atomic scan states
│   │   │   └── AuditLog.js                # Immutable audit event log
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── registrationRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── ticketRoutes.js
│   │   │   ├── scannerRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   └── auditRoutes.js
│   │   ├── services/
│   │   │   ├── auditService.js            # Audit logger helper
│   │   │   ├── qrService.js               # Opaque QR code generator
│   │   │   ├── pdfService.js              # Server-side PDF ticket builder
│   │   │   └── storageService.js          # Path-traversal proof storage helper
│   │   ├── utils/
│   │   │   ├── cryptoUtils.js             # 256-bit token & SHA-256 hashing
│   │   │   ├── idGenerator.js             # Unique REG and TCK ID generators
│   │   │   └── fileValidation.js          # Binary magic bytes header verification
│   │   ├── validation/
│   │   │   └── validators.js              # Express-validator rule definitions
│   │   ├── scripts/
│   │   │   └── seedAdmin.js               # Standalone admin seed CLI script
│   │   ├── tests/
│   │   │   └── portal.test.js             # Complete 20-scenario automated test suite
│   │   ├── app.js                         # Express application definition
│   │   └── server.js                      # HTTP server bootstrap & graceful shutdown
│   ├── .env.example
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx                  # Accessible modal wrapper
│   │   │   ├── Navbar.jsx                 # Public & Admin navigation headers
│   │   │   ├── Sidebar.jsx                # 11-item admin navigation sidebar
│   │   │   ├── StatsCard.jsx              # Executive metrics card
│   │   │   ├── StatusBadge.jsx            # Color-coded status indicators
│   │   │   ├── TicketCard.jsx             # Digital printable event pass layout
│   │   │   ├── RegistrationDetailModal.jsx# Payment screenshot inspection modal
│   │   │   ├── RejectModal.jsx            # Rejection reason modal
│   │   │   ├── RevokeModal.jsx            # Ticket revocation modal
│   │   │   └── SkeletonLoader.jsx         # Loading skeletons
│   │   ├── context/
│   │   │   ├── AuthContext.jsx            # Admin session state provider
│   │   │   └── ToastContext.jsx           # Animated notification alerts
│   │   ├── pages/
│   │   │   ├── PublicRegistration.jsx     # Public attendee registration page
│   │   │   ├── AdminLogin.jsx             # Secure admin sign-in page
│   │   │   ├── DashboardOverview.jsx      # Telemetry & stats overview
│   │   │   ├── RegistrationsList.jsx      # Searchable attendee management table
│   │   │   ├── TicketManagement.jsx       # QR pass distribution & revocation
│   │   │   ├── QRScannerPage.jsx          # Live camera QR scanner page
│   │   │   ├── AuditLogsPage.jsx          # Security audit trail review
│   │   │   └── SettingsPage.jsx           # System configuration & policies
│   │   ├── services/
│   │   │   └── api.js                     # Axios instance with interceptors
│   │   ├── App.jsx                        # Route configuration
│   │   ├── main.jsx                       # React entrypoint
│   │   └── index.css                      # Tailwind styling & print directives
│   ├── index.html
│   ├── vite.config.js                     # Vite dev server & proxy settings
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## ⚙️ Prerequisites & Environment Variables

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20 / v24 LTS recommended)
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas URI or local MongoDB installation (Fallback: automatically runs embedded in-memory MongoDB when `MONGODB_URI=memory`).

### Backend Environment Configuration (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

# Database Connection (MongoDB Atlas or 'memory' for embedded dev)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/event_portal?retryWrites=true&w=majority

# Security Secrets (Must be changed in production to at least 32 random characters)
JWT_SECRET=production_grade_random_jwt_secret_change_in_production_min_32_chars!
JWT_EXPIRES_IN=7d
COOKIE_SECRET=production_grade_cookie_secret_change_in_production_987654321

# Master Administrator Credentials (Seeded on first startup)
ADMIN_EMAIL=admin@eventportal.com
ADMIN_INITIAL_PASSWORD=AdminSecurePass!2026

# URLs & CORS Allowlist
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Private Storage Parameters
UPLOAD_MAX_SIZE_MB=5
UPLOAD_DIR=private_uploads

# Event Metadata
EVENT_NAME="GLOBAL TECH SUMMIT 2026"
EVENT_DATE="November 20-22, 2026"
EVENT_LOCATION="International Convention Center, Hall A"
```

### Frontend Environment Configuration (`frontend/.env`)

```env
VITE_API_URL=/api
VITE_EVENT_NAME="GLOBAL TECH SUMMIT 2026"
```

---

## 🚀 Quick Start & Setup Instructions

### 1. Clone or Open Workspace
Ensure you are in the project root directory (`e:\regirtration portal`).

### 2. Install Dependencies

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 3. Initialize the Single Master Admin
The application automatically creates the initial master admin account upon first startup using the credentials specified in `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`.

You can also run the seed script directly at any time:
```bash
cd backend
npm run seed:admin
```
*Note: If an administrator already exists in MongoDB, the script detects it and prevents duplicate creation.*

---

## 💻 Running the Application

### Start the Backend Server
```bash
cd backend
npm start
```
*Backend runs at: `http://localhost:5000` (API mounted at `/api`)*

### Start the Frontend Application
```bash
cd frontend
npm run dev
```
*Frontend runs at: `http://localhost:5173` (or `http://localhost:5174` if 5173 is occupied)*

### Access Points
- **Public Registration Portal:** `http://localhost:5173/`
- **Admin Login Gateway:** `http://localhost:5173/admin/login`
- **Default Master Admin Email:** `admin@eventportal.com`
- **Default Master Admin Password:** `AdminSecurePass!2026`

---

## 🧪 Automated Testing Suite

The project includes an end-to-end automated test suite covering all 18 specified scenarios:

| # | Test Scenario | Result |
| :--- | :--- | :--- |
| 1 | Attendee submits valid registration with authentic PNG screenshot | ✅ **PASSED** |
| 2 | Invalid email format is rejected with 400 | ✅ **PASSED** |
| 3 | Missing required fields are rejected with 400 | ✅ **PASSED** |
| 4 | Fake image file (extension spoofing) is rejected by binary inspection | ✅ **PASSED** |
| 5 | Registration appears in admin dashboard table | ✅ **PASSED** |
| 6 | Payment screenshot is viewable by authenticated admin | ✅ **PASSED** |
| 7 | Admin approves payment and updates state to APPROVED | ✅ **PASSED** |
| 8 | QR ticket is generated **only** after payment approval | ✅ **PASSED** |
| 9 | Admin downloads vector PDF ticket | ✅ **PASSED** |
| 10 | Admin rejects payment with reason | ✅ **PASSED** |
| 11 | Rejected attendee cannot enter (no ticket generated) | ✅ **PASSED** |
| 12 | First QR scan succeeds with `ENTRY SUCCESSFUL` | ✅ **PASSED** |
| 13 | Second QR scan fails with `ALREADY SCANNED` and displays original entry time | ✅ **PASSED** |
| 14 | **Race Condition Test:** Simultaneous concurrent scans allow strictly **ONE** admission | ✅ **PASSED** |
| 15 | Invalid/tampered QR code is rejected with `INVALID QR CODE` | ✅ **PASSED** |
| 16 | Unauthenticated visitors cannot access admin endpoints | ✅ **PASSED** |
| 17 | Admin logout successfully terminates session and clears cookies | ✅ **PASSED** |
| 18 | Private payment screenshots cannot be accessed publicly without admin session | ✅ **PASSED** |
| 19 | Single admin constraint: duplicate admin creation rejected | ✅ **PASSED** |
| 20 | Repeated payment approval attempt blocked | ✅ **PASSED** |

### Running the Tests:
```bash
cd backend
npm test
```
*All 20 tests execute against an isolated in-memory MongoDB instance with zero external dependencies.*

---

## 📡 API Documentation

### Public Endpoints
- `GET /api/health` - Server health check and environment status
- `GET /api/config/public` - Fetch public departments list, upload limits, and event details
- `POST /api/registrations` - Submit registration (`multipart/form-data`: `fullName`, `email`, `department`, `phoneNumber`, `paymentProof`)

### Authentication Endpoints
- `GET /api/auth/setup-status` - Check if master admin has been initialized
- `POST /api/auth/login` - Authenticate master admin (rate-limited)
- `POST /api/auth/logout` - Invalidate session & clear HttpOnly cookie
- `GET /api/auth/me` - Verify current administrator session

### Registration Management (Admin Protected)
- `GET /api/registrations` - List registrations with pagination, search, and department/status filtering
- `GET /api/registrations/:id` - Get full details of a specific registration
- `GET /api/registrations/:id/payment-proof` - Authenticated stream for payment screenshot

### Payment Verification (Admin Protected)
- `POST /api/payments/registrations/:id/approve` - Approve payment & atomically generate QR ticket
- `POST /api/payments/registrations/:id/reject` - Reject payment with mandatory reason

### Ticket Management (Admin Protected)
- `GET /api/tickets` - List tickets with delivery, entry, and revocation status filters
- `GET /api/tickets/:id` - Get ticket details
- `GET /api/tickets/:id/print-data` - Retrieve ticket data and QR code Data URL
- `GET /api/tickets/:id/download-pdf` - Download vector PDF admission pass
- `PATCH /api/tickets/:id/mark-sent` - Mark ticket as manually sent to attendee
- `PATCH /api/tickets/:id/revoke` - Revoke ticket with reason

### Gate Scanner (Admin Protected)
- `POST /api/scanner/verify` - Atomic verification and scan check-in (`{ token: string }`)

### Dashboard & Auditing (Admin Protected)
- `GET /api/dashboard/stats` - Summary counts and live recent activity
- `GET /api/audit` - Paginated immutable security audit trail

---

## 🌐 Production Deployment Guide

### 1. MongoDB Atlas Configuration
1. Create a MongoDB Atlas cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with read/write privileges.
3. In Network Access, add your production server IP (or `0.0.0.0/0` if hosted on dynamic container platforms like Render, Railway, or Heroku).
4. Update `MONGODB_URI` in `backend/.env`.

### 2. Camera-Based QR Scanning HTTPS Requirement
Browser security standards (`getUserMedia` API) **require HTTPS** in production to grant camera access. On `localhost` (development), browsers automatically allow camera permissions over HTTP. For production domains, deploy with an SSL certificate (e.g., Let's Encrypt / Cloudflare).

### 3. Production Build & Execution

#### Build Frontend:
```bash
cd frontend
npm run build
```
This produces optimized production assets in `frontend/dist/`.

#### Run Backend in Production Mode:
```bash
cd backend
export NODE_ENV=production
npm start
```
*(On Windows: `$env:NODE_ENV="production"; npm start`)*

### 4. Nginx Reverse Proxy Configuration Example

```nginx
server {
    listen 80;
    server_name event.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name event.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/event.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/event.yourdomain.com/privkey.pem;

    # Serve built frontend static assets
    location / {
        root /var/www/event-portal/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API and file stream requests to Express
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 10M;
    }
}
```

---

## 🛡️ License

This project is licensed under the ISC License. Designed for high-security enterprise event admissions.
