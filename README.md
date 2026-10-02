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

- `GET /api/recipients/lookup?q=...` — Privacy-safe recipient directory search by phone, email, or name
- `POST /api/transactions/assess` — Stage 1 behavioral & velocity ML evaluation
- `POST /api/transactions/{id}/verify` — Stage 2 recipient & social communication forensic verification
- `POST /api/communication/analyze` — Real-time interactive forensic preview of social messaging excerpts
- `GET /api/manager/queue` — Active bank review queue of held transactions
- `POST /api/manager/investigate/{id}` — Human-in-the-loop investigation action (APPROVE, DENY, REQUEST_INFO)
- `GET /api/transactions/{id}` — Live status tracker for customer screen polling
- `GET /api/audit`, `GET /api/metrics` — Audit logs and latency metrics
