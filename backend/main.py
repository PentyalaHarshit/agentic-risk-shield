import os
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


from bank_db import BankDatabase

# ---------- Bank Database Recipient Directory (Bank of America / Wells Fargo style) ----------
@app.get("/api/recipients/lookup", response_model=RecipientProfile)
def get_recipient_lookup(
    q: str = Query(..., description="Phone number, email, or name to verify"),
    sender_user_id: Optional[str] = Query("harshit", description="Logged-in customer user ID")
):
    """Lookup registered recipient in Bank Database and return masked profile."""
    rec = BankDatabase.lookup_recipient(q, owner_user_id=sender_user_id)
    return RecipientProfile(**rec)


@app.post("/api/recipients/lookup", response_model=RecipientProfile)
def post_recipient_lookup(req: RecipientLookupIn):
    query_str = req.phone or req.email or req.query or ""
    rec = BankDatabase.lookup_recipient(query_str, owner_user_id=req.sender_user_id)
    return RecipientProfile(**rec)


@app.get("/api/bank/users")
def get_bank_users():
    """Returns all registered bank accounts and profiles in the bank database."""
    return BankDatabase.list_all_users()


@app.get("/api/recipients/sample", response_model=List[RecipientProfile])
def get_sample_recipients():
    return list_sample_recipients()


# ---------- Transaction Assessment & Verification ----------
@app.post("/api/transactions/assess", response_model=AssessmentOut)
def assess(t: TransactionIn):
    """Stage 1: fast risk score. Very low -> APPROVE | Elevated -> REQUIRE_VERIFICATION | Critical -> STOP."""
    result = orch.assess(t)

    # Record in database ledger
    lookup_term = t.recipient_phone or t.recipient_email or t.recipient_name or ""
    rec_info = BankDatabase.lookup_recipient(lookup_term, owner_user_id=t.user_id)
    rec_id = t.recipient_user_id or rec_info.get("internal_user_id") or 2

    tid = result.get("transaction_id", "")
    decision = result.get("decision", "")
    score = result.get("risk_score", 0.0)
    status = result.get("status", "PENDING")

    BankDatabase.record_transaction(
        tid=tid,
        sender_uid=t.user_id,
        recipient_id=rec_id,
        amount=t.amount,
        s1_score=score,
        s1_decision=decision,
        status=status
    )

    if decision == "APPROVE":
        BankDatabase.settle_transaction(tid, "COMPLETED", "APPROVE")

    return result


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
        res = orch.process_manager_decision(
            tid=tid,
            action=dec.action.upper(),
            manager_name=dec.manager_name or "Operations Manager",
            notes=dec.notes
        )
        if dec.action.upper() == "APPROVE":
            BankDatabase.settle_transaction(tid, "COMPLETED", "APPROVE")
        elif dec.action.upper() == "DENY":
            BankDatabase.settle_transaction(tid, "BLOCKED", "DENY")
        return res
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


# =====================================================================
# Research Workbench Endpoints (12-Point Research Framework)
# =====================================================================
from ml.baselines import get_baseline_evaluator
from ml.adaptive_thresholds import get_optimizer
from ml.ablation_study import get_ablation_runner
from rag.rag_evaluator import get_rag_evaluator
from benchmarks.engine_bench import get_performance_benchmark
from research.failure_analysis import FailureAnalysisService
import pandas as pd

@app.get("/api/research/problem")
def get_research_problem():
    """Defines the central research question, hypothesis, and core contributions."""
    return {
        "title": "A Two-Stage Agentic Risk Assessment Framework for Real-Time Financial Transactions",
        "central_research_question": "Can a two-stage adaptive transaction-risk system reduce unnecessary customer verification while maintaining strong risk-detection performance?",
        "hypothesis": "By decoupling lightweight statistical screening (Stage 1) from deep multi-agent evidence fusion and RAG policy grounding (Stage 2), banks can reduce customer verification friction by over 75% while detecting sophisticated social-engineering scams that bypass traditional rules and single-stage ML.",
        "primary_contributions": [
            {
                "id": 1,
                "title": "Adaptive Two-Stage Risk Routing",
                "description": "Data-driven, cost-optimal routing separates very low-risk transactions (zero customer friction) from suspicious transactions requiring multi-agent forensic verification."
            },
            {
                "id": 2,
                "title": "Multi-Agent Evidence Fusion",
                "description": "Transaction, Communication, Relationship, and History Agents independently gather and interpret evidence before statistical calibration, eliminating uncontrolled LLM hallucinations in financial decisions."
            },
            {
                "id": 3,
                "title": "Human-Grounded Decision Pipeline",
                "description": "Calibrated ML + SHAP XAI + RAG policy retrieval + bank operations investigator review rather than allowing an LLM to make an uncontrolled financial decision."
            }
        ],
        "architectural_separation": {
            "authentication_layer": "Bank-of-America style registration, OTP verification, Biometric Face ID, and Passkey",
            "risk_research_layer": "Stage 1 Screening -> Adaptive Corridors -> Multi-Agent Swarm -> SHAP -> RAG -> Human Review"
        }
    }


@app.get("/api/research/dataset")
def get_dataset_metadata():
    """Returns synthetic benchmark dataset attributes, schema, and sample records."""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_transactions.csv")
    if not os.path.exists(csv_path):
        from data.generate_dataset import save_benchmark_dataset
        csv_path = save_benchmark_dataset()

    df = pd.read_csv(csv_path)
    total_tx = len(df)
    fraud_cases = int(df["fraud_label"].sum())
    fraud_pct = round(float(fraud_cases / total_tx * 100), 2)
    sample_rows = df.head(10).to_dict(orient="records")

    fields = [
        {"name": "transaction_id", "type": "string", "description": "Unique transaction tracking identifier"},
        {"name": "customer_id", "type": "string", "description": "Originating banking customer ID"},
        {"name": "recipient_id", "type": "string", "description": "Destination counterparty ID"},
        {"name": "amount", "type": "float", "description": "Transaction value in USD (Pareto lognormal distribution)"},
        {"name": "hour", "type": "int", "description": "Time of day (0-23) for temporal pattern analysis"},
        {"name": "day_of_week", "type": "int", "description": "Day of week (0=Mon, 6=Sun)"},
        {"name": "account_age", "type": "int", "description": "Sender account age in days"},
        {"name": "recipient_age", "type": "int", "description": "Recipient account age in days (new vs seasoned)"},
        {"name": "recipient_new", "type": "binary", "description": "1 if first-time transfer to counterparty, 0 otherwise"},
        {"name": "previous_transaction_count", "type": "int", "description": "Historical transfer count between customer and recipient"},
        {"name": "average_transfer_amount", "type": "float", "description": "Customer 90-day typical transfer baseline"},
        {"name": "transfer_velocity", "type": "int", "description": "Total transfer count initiated in trailing 24 hours"},
        {"name": "location_distance", "type": "float", "description": "Geographical deviation distance in kilometers"},
        {"name": "device_change", "type": "binary", "description": "1 if transfer from unrecognized device fingerprint"},
        {"name": "failed_login_count", "type": "int", "description": "Consecutive failed authentication attempts prior to transfer"},
        {"name": "communication_signal", "type": "float", "description": "Normalized conversational urgency / payment pressure [0.0, 1.0]"},
        {"name": "historical_risk", "type": "float", "description": "Prior behavioral risk score on file"},
        {"name": "fraud_label", "type": "binary", "description": "Ground truth label (1 = confirmed fraud / scam, 0 = legitimate)"}
    ]

    return {
        "dataset_name": "Synthetic Financial Risk Benchmark Dataset (Research Labeled)",
        "label": "SYNTHETIC BENCHMARK DATASET (Explicitly labeled for reproducible research)",
        "total_transactions": total_tx,
        "fraud_cases": fraud_cases,
        "fraud_prevalence_pct": fraud_pct,
        "features_count": len(fields),
        "features": fields,
        "samples": sample_rows
    }


@app.get("/api/research/baselines")
def get_ml_baselines():
    """Evaluates and compares 5 ML baselines on identical held-out test split."""
    evaluator = get_baseline_evaluator()
    return evaluator.run_all_baselines()


@app.get("/api/research/controlled-experiments")
def get_controlled_experiments():
    """Returns controlled Experiment A: One-stage vs Two-stage architectures."""
    evaluator = get_baseline_evaluator()
    res = evaluator.run_all_baselines()
    return {
        "experiment_name": "Experiment A: Single-Stage vs Two-Stage Verification Tradeoff",
        "hypothesis": "Two-stage adaptive routing reduces verification friction while preserving or improving detection recall.",
        "comparisons": res["controlled_experiment_a"],
        "key_finding": res["key_finding"]
    }


@app.get("/api/research/optimize-thresholds")
def optimize_stage1_thresholds(
    cost_fp: float = Query(10.0, description="Cost of false positive (blocking legitimate customer)"),
    cost_fn: float = Query(180.0, description="Cost of false negative (letting fraud through)"),
    cost_friction: float = Query(1.5, description="Cost of customer verification friction")
):
    """Computes empirical cost-optimal (theta_low, theta_high) on validation set."""
    optimizer = get_optimizer()
    return optimizer.optimize(cost_fp=cost_fp, cost_fn=cost_fn, cost_friction=cost_friction)


@app.get("/api/research/ablation")
def get_ablation_study():
    """Runs systematic ablation study removing one component at a time."""
    runner = get_ablation_runner()
    return runner.run_full_ablation_study()


@app.get("/api/research/rag-eval")
def get_rag_eval():
    """Computes measurable RAG benchmark metrics (Recall@K, Precision@K, grounding score)."""
    evaluator = get_rag_evaluator()
    return evaluator.evaluate(k_max=3)


@app.get("/api/research/cpp-benchmark")
def get_cpp_benchmark():
    """Executes C++ thread pool vs Python sequential vs Python concurrent performance benchmark."""
    bench = get_performance_benchmark()
    return bench.run_all()


@app.get("/api/research/failure-analysis")
def get_failure_analysis():
    """Returns 5 categorized failure case studies with root cause and mitigations."""
    return {
        "summary": FailureAnalysisService.get_summary_metrics(),
        "cases": FailureAnalysisService.list_all_cases()
    }

