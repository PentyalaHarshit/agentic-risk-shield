# Risk Shield Banking Network

A real-time two-stage financial transaction security platform combining behavioral ML, agentic AI, communication forensics, RAG-based policy reasoning, explainable risk analysis, and human-in-the-loop transaction review.

Inspired by modern banking verification flows (such as Bank of America / Wells Fargo / Zelle recipient lookups and fraud review policies), without using proprietary code or trademarks.

```
                   React Customer Banking Web Portal
             (Corporate Skyline Background & Dynamic Themes)
                                     │
                                     ▼
                Search Recipient by Phone Number or Email
                                     │
                                     ▼
                 FastAPI Gateway: /api/recipients/lookup
                                     │
                                     ▼
                         Simulated Banking Directory
                     (Masked Phone, Email, City, Status)
                                     │
                                     ▼
                       [✓ THIS IS THE CORRECT PERSON]
                                     │
                                     ▼
                              Stage 1 ML Model
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
                  VERY LOW         HIGH           CRITICAL
                     │               │               │
                     ▼               ▼               ▼
                  APPROVE         Stage 2      🚫 STOPPED
                (Transferred)   Verification  ("Funds not transferred")
                                     │
                                     ▼
                               I WANT TO PAY
                                     │
                                     ▼
                           Communication Forensics
                        (WhatsApp, iMessage, etc.)
                                     │
                                     ▼
                            Multi-Agent Pipeline
                         (Transaction, Comm, Rel,
                            Risk, RAG, Decision)
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
                 LOW RISK                        HIGH RISK
                     │                               │
                     ▼                               ▼
                  APPROVE                      🟡 ON HOLD
                (Transferred)             ("Awaiting Bank Review")
                                                     │
                                                     ▼
                                            BANK REVIEW QUEUE
                                                     │
                                                     ▼
                                         👨‍💼 Bank Manager Portal
                                           (Multi-Factor Audit)
                                                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                     [✓ APPROVE]           [🚫 DENY]
                                          │                     │
                                          ▼                     ▼
                                    TRANSFER SENT        TRANSFER STOPPED
```

---

## Authentication & Biometric Face ID (Bank of America Style)

The system features an institutional Bank of America-inspired authentication gateway:

```
                    ┌──────────────────────┐
                    │   CREATE ACCOUNT     │
                    └──────────┬───────────┘
                               │
                               ▼
                 Full Legal Name / User ID / Password
                       Email / Phone Number
                               │
                               ▼
                    ┌──────────────────┐
                    │ Identity Verify  │
                    └──────────┬───────┘
                               │
                               ▼
                      Email OTP / SMS OTP
                               │
                               ▼
                        OTP VERIFIED ✓
                               │
                   ┌───────────────────────┐
                   │   REGISTER FACE ID    │
                   │                       │
                   │  1. Look Center   👤  │
                   │  2. Look Left    👤←  │
                   │  3. Look Right   →👤  │
                   │  4. Look Up/Down ↑👤↓ │
                   └───────────┬───────────┘
                               │
                               ▼
                       Face Enrollment ✓
                               │
                               ▼
                      ACCOUNT CREATED ✓
                               │
                               ▼
                            SIGN IN
                          /         \
                         /           \
               User ID + Password    Face ID
                       │                │
                       ▼                ▼
                 Authenticate      Biometric Radar
                         \              /
                          \            /
                           ▼          ▼
                        BANKING DASHBOARD
                               │
                               ▼
                     QuickPay + Risk Shield
```

### 1. Bank of America Style Registration
- **Fields**: Full Legal Name, User ID, Password, Confirm Password, Email Address, and Mobile Phone Number.
- Password complexity validation, email normalization, and secure salt-hashed password credentials.

### 2. Multi-Channel Identity Verification (OTP)
- Instant 6-digit one-time passcode generated and delivered via Email & SMS simulations.
- Bank-grade 6-box auto-advancing input field with backspace and clipboard paste support.
- Configurable 5-minute passcode expiration and resend cooldown rate-limiting.

### 3. 4-Direction Biometric Face ID Enrollment (Human Vision)
- Real-time webcam integration via browser `navigator.mediaDevices.getUserMedia` paired with high-tech vision telemetry (with animated landmark calibration fallback).
- Multi-angle 4-pose registration requirement:
  1. **Look Center (Straight)** 👤
  2. **Turn Head Left** 👤 ←
  3. **Turn Head Right** → 👤
  4. **Look Slightly Up / Down** ↑ 👤 ↓
- Visual angle reticles, dynamic laser scanlines, and biometric angle completion checkpoints.

### 4. Dual-Mode Authentication (Password or Face ID)
- **Mode A (Credentials)**: User ID + Password authentication with demo pre-fill (`harshit` / `RiskShield@2026`).
- **Mode B (Face ID)**: Circular radar sweep biometric face scanner with instant matching against enrolled facial telemetry.
- Seamless transition to the authenticated **QuickPay + Risk Shield Banking Dashboard** (`$14,250.00` balance, recipient lookup, behavioral ML, communication forensics, and bank operations review).
- Session termination with one-click **Sign Out** returning securely to the login portal.

---

## Bank Database & Recipient Architecture

The backend implements a relational database engine (`backend/bank_db.py`) storing customer profiles, checking accounts, relationship contacts, and transactional ledgers:

```
REGISTER
     │
User A ────────────────┐
                       │
User B ────────────────┤ Bank Database (SQLite3 / PostgreSQL)
                       │  - users
User C ────────────────┘  - bank_accounts
     ▲                    - saved_recipients
     │                    - transactions
LOGIN
     │
SEND MONEY
     │
Phone / Email Query
     │
Find User B (Bank DB Query)
     │
Verify Recipient (Masked Card)
     │
Risk Shield (Stages 1 & 2)
     │
Transfer Funds (Internal IDs & Real-Time Balance Settlement)
```

### Relational Schema

1. **`users`**:
   - `id` (INTEGER PRIMARY KEY)
   - `full_name`, `user_id`, `password_hash`, `salt`
   - `email`, `phone_number`, `phone_digits`, `location`
   - `email_verified`, `phone_verified`, `face_credential_id`
   - `account_status`, `created_at`
2. **`bank_accounts`**:
   - `id` (INTEGER PRIMARY KEY)
   - `user_id` (REFERENCES users(id))
   - `account_number_masked` (e.g. `Advantage Checking (...8492)`)
   - `account_type` (`CHECKING`)
   - `available_balance` (Real-time balance tracking)
   - `account_status` (`ACTIVE`)
3. **`saved_recipients`**:
   - `owner_user_id`, `recipient_user_id`
   - `nickname`, `prior_transfers`, `last_transfer_at`
   - Distinguishes **Known Contacts** (e.g., Sarah Miller, 14 prior transfers) from **New Recipients** (0 prior transfers).
4. **`transactions`**:
   - `id` (`TX-XXXXXX`)
   - `sender_user_id`, `recipient_user_id`
   - `sender_account_id`, `recipient_account_id`
   - `amount`, `stage_1_risk_score`, `stage_1_decision`, `status`
   - Automatic double-entry balance settlement upon approval.

### Recipient Lookup Flow

When the customer enters a phone number or email:
1. React sends `POST /api/recipients/lookup` with `{ "phone": "+12145550192" }` or `{ "email": "..." }`.
2. FastAPI queries the database:
   ```sql
   SELECT id, full_name, phone_number, email, location, account_status
   FROM users
   WHERE phone_digits LIKE :phone_digits OR email = :email;
   ```
3. The frontend displays the Bank of America-style verification card:
   ```
   ┌──────────────────────────────────────┐
   │          Verify Recipient            │
   │                                      │
   │  👤 John Michael Smith               │
   │                                      │
   │  📱 +1 (214) ***-0192                │
   │  📧 j***@example.test                │
   │  📍 Dallas, Texas                    │
   │                                      │
   │  ✓ Phone matches registered recipient│
   │  ✓ Recipient account verified        │
   │  ⚠ New recipient                     │
   │                                      │
   │  [ ✓ THIS IS THE CORRECT PERSON ]    │
   └──────────────────────────────────────┘
   ```
4. Transfer requests reference internal IDs (`sender_user_id`, `recipient_user_id`, `sender_account_id`, `recipient_account_id`) ensuring relational integrity.

---

## Three Possible Endings

### 1. Very Low Risk (Auto-Approved)
```text
Stage 1 -> VERY LOW -> ✅ AUTO-APPROVED
```
- Transferred instantly with zero user friction.
- Status: `✓ COMPLETED`, funds transferred immediately.

### 2. Critical Risk (Transfer Stopped)
```text
Stage 1 / Stage 2 -> CRITICAL -> 🚫 TRANSFER STOPPED
```
- The transaction is immediately stopped to prevent unauthorized fund loss.
- Customer message: *"Your transfer was not completed because critical security risk indicators were detected."*
- `funds_transferred: false`, `status: "BLOCKED"`, `reason_code: "CRITICAL_RISK"`.
- Adheres to **POLICY-007**: states a risk assessment and never accuses anyone of being a scammer.

### 3. Hold (Human-in-the-Loop Bank Operations Review)
```text
Risk Assessment -> HOLD -> 👨‍💼 Bank Operations -> Senior Risk Investigator -> [ APPROVE / DENY ]
```
- Ambiguous or high-risk transfers are placed on **HOLD** (`status: "ON_HOLD"`).
- Automatically routed to the **Bank Review Queue** in the Bank Operations Console.
- Senior Risk Investigator inspects the multi-agent audit trail, communication forensics, and policy grounds, then executes the final operational decision (`APPROVE` or `DENY`).
- The customer's mobile banking screen updates live via reactive polling as soon as the manager decides.

---

## Frontend Design & Visual Aesthetics

- **Corporate Financial Skyline & Growth Chart Background**: Institutional banking skyline wallpaper featuring rising sun, market growth candlesticks, and royal blue / crimson framing ribbons.
- **Colorful Rectangle Box Themes**:
  - **🔴🔵 Royal & Crimson Ribbon**: Multi-color navy/blue/crimson gradient body with a 5px glowing top ribbon band and ambient drop shadows matching the background ribbons.
  - **🟣 Cyber Indigo & Violet**: High-tech fintech gradient with violet/indigo border glow.
  - **🟢 Emerald & Gold**: Classic banking trust theme with rich emerald and amber tones.
  - **Interactive Theme Switcher**: Instant real-time preview directly from the header toolbar.
- **Privacy-Safe Recipient Identity Card**: Displays masked phone (`+1 (214) ***-1641`), masked email (`r***@gmail.com`), location, and network verification badges prior to initiating transfers.

---

## Run Locally

```bash
# 1. C++ Velocity Engine (optional for native multithreading)
cd cpp_engine && make && cd ..

# 2. Backend FastAPI
cd backend
pip install -r requirements.txt
python ml/risk_model.py                  # trains stage1/stage2 models on synthetic data
uvicorn main:app --reload --port 8000    # API on :8000 (docs at /docs)

# 3. Stream Consumer (demo simulation)
python stream_consumer.py --demo         # C++ engine + orchestrator on fake events

# 4. Frontend (Dual Customer Mobile App + Bank Operations Portal)
cd ../frontend
npm install
npm run dev                              # UI on :5173
```

---

## API Endpoints

### Authentication & Biometrics
- `POST /api/auth/register` — Create new banking account (Full Name, User ID, Password, Email, Phone)
- `POST /api/auth/verify-otp` — Verify 6-digit Email/SMS security code
- `POST /api/auth/resend-otp` — Regenerate and resend fresh 6-digit OTP code
- `POST /api/auth/enroll-face` — Enroll 4-direction biometric face telemetry (Center, Left, Right, Up/Down)
- `POST /api/auth/login-password` — Authenticate via User ID and Password
- `POST /api/auth/login-face` — Authenticate via biometric Face ID radar scanning
- `GET /api/auth/me` — Retrieve active session profile and verification status

### Risk Shield & Transfers
- `GET /api/recipients/lookup?q=...` — Privacy-safe recipient directory search by phone, email, or name
- `POST /api/transactions/assess` — Stage 1 behavioral & velocity ML evaluation
- `POST /api/transactions/{id}/verify` — Stage 2 recipient & social communication forensic verification
- `POST /api/communication/analyze` — Real-time interactive forensic preview of social messaging excerpts
- `GET /api/manager/queue` — Active bank review queue of held transactions
- `POST /api/manager/investigate/{id}` — Human-in-the-loop investigation action (APPROVE, DENY, REQUEST_INFO)
- `GET /api/transactions/{id}` — Live status tracker for customer screen polling
- `GET /api/audit`, `GET /api/metrics` — Audit logs and latency metrics

