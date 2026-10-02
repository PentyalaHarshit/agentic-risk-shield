from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from schemas.transaction import (
    TransactionIn,
    RecipientVerification,
    AssessmentOut,
    CommunicationAnalysisIn,
    CommunicationEvidence,
    RecipientProfile,
    RecipientLookupIn,
    ManagerDecisionIn
)
from agents.orchestrator import Orchestrator
from recipient_directory import lookup_recipient, list_sample_recipients

from auth import (
    AuthService,
    RegisterIn,
    VerifyOtpIn,
    EnrollFaceIn,
    LoginPasswordIn,
    LoginFaceIn,
    AuthSessionOut,
    UserProfile
)

app = FastAPI(title="Real-Time Agentic Financial Risk Platform")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
orch = Orchestrator()


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Real-Time Agentic Financial Risk Platform",
        "docs": "/docs",
        "health": "/health",
        "endpoints": [
            "/api/recipients/lookup",
            "/api/transactions/assess",
            "/api/transactions/{tid}/verify",
            "/api/manager/queue",
            "/api/manager/investigate/{tid}"
        ]
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Simulated Recipient Directory (Zelle / BofA / Wells Fargo style) ----------
@app.get("/api/recipients/lookup", response_model=RecipientProfile)
def get_recipient_lookup(q: str = Query(..., description="Phone number, email, or name to verify")):
    """Lookup registered recipient in simulated banking directory and return masked profile."""
    return lookup_recipient(q)


@app.post("/api/recipients/lookup", response_model=RecipientProfile)
def post_recipient_lookup(req: RecipientLookupIn):
    return lookup_recipient(req.query)


@app.get("/api/recipients/sample", response_model=List[RecipientProfile])
def get_sample_recipients():
    return list_sample_recipients()


# ---------- Transaction Assessment & Verification ----------
@app.post("/api/transactions/assess", response_model=AssessmentOut)
def assess(t: TransactionIn):
    """Stage 1: fast risk score. Very low -> APPROVE | Elevated -> REQUIRE_VERIFICATION | Critical -> STOP."""
    return orch.assess(t)


@app.get("/api/transactions/{tid}", response_model=AssessmentOut)
def get_transaction_status(tid: str):
    """Retrieve current state and manager updates for a transaction."""
    tx = orch.get_transaction(tid)
    if not tx:
        raise HTTPException(404, f"Transaction {tid} not found")
    return tx


@app.post("/api/transactions/{tid}/verify", response_model=AssessmentOut)
def verify(tid: str, v: RecipientVerification):
    """Stage 2: after 'I WANT TO PAY' + verification form -> multi-agent analysis."""
    try:
        return orch.verify(tid, v)
    except KeyError:
        raise HTTPException(404, "Unknown transaction ID")
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/communication/analyze", response_model=CommunicationEvidence)
def analyze_communication(c: CommunicationAnalysisIn):
    """Interactive preview/analysis of social media & communication evidence."""
    return orch.comm_agent.analyze(
        channel=c.channel,
        text=c.description,
        relationship=c.relationship,
        reason=c.reason,
    )


# ---------- Bank Manager Operations & Investigation Queue ----------
@app.get("/api/manager/queue", response_model=List[AssessmentOut])
def get_manager_investigation_queue():
    """Returns all transactions held for bank manager investigation."""
    return orch.get_manager_queue()


@app.post("/api/manager/investigate/{tid}", response_model=AssessmentOut)
def investigate_transaction(tid: str, dec: ManagerDecisionIn):
    """Human-in-the-loop: Bank Manager approves, denies, or requests info on a held transaction."""
    try:
        return orch.process_manager_decision(
            tid=tid,
            action=dec.action.upper(),
            manager_name=dec.manager_name or "Operations Manager",
            notes=dec.notes
        )
    except KeyError:
        raise HTTPException(404, f"Transaction {tid} not found in review queue")


@app.get("/api/audit")
def audit():
    return orch.audit[-200:]


@app.get("/api/metrics")
def metrics():
    lat = sorted(a["latency_ms"] for a in orch.audit) or [0]
    return {
        "count": len(orch.audit),
        "p50_ms": lat[len(lat) // 2],
        "p95_ms": lat[max(int(len(lat) * 0.95) - 1, 0)],
        "held_count": len(orch.get_manager_queue())
    }


# ---------- Bank of America Style Authentication & Biometric Face ID ----------
@app.post("/api/auth/register")
def register_user(data: RegisterIn):
    try:
        return AuthService.register(data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/auth/verify-otp")
def verify_user_otp(data: VerifyOtpIn):
    try:
        return AuthService.verify_otp(data.user_id, data.code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/auth/resend-otp")
def resend_user_otp(req: dict):
    uid = req.get("user_id")
    if not uid:
        raise HTTPException(400, "Missing user_id")
    try:
        return AuthService.resend_otp(uid)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/auth/enroll-face")
def enroll_face_id(data: EnrollFaceIn):
    try:
        return AuthService.enroll_face(data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/auth/login-password", response_model=AuthSessionOut)
def login_with_password(data: LoginPasswordIn):
    try:
        return AuthService.login_password(data.user_id, data.password)
    except ValueError as e:
        raise HTTPException(401, str(e))


@app.post("/api/auth/login-face", response_model=AuthSessionOut)
def login_with_face_id(data: LoginFaceIn):
    try:
        return AuthService.login_face(data.user_id, data.face_sample)
    except ValueError as e:
        raise HTTPException(401, str(e))


@app.get("/api/auth/me", response_model=Optional[UserProfile])
def get_current_user(token: str = Query(...)):
    return AuthService.get_user_from_token(token)

