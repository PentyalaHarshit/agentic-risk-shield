from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas.transaction import (
    TransactionIn,
    RecipientVerification,
    AssessmentOut,
    CommunicationAnalysisIn,
    CommunicationEvidence,
)
from agents.orchestrator import Orchestrator

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
    }


@app.get("/health")
def health(): return {"status": "ok"}


@app.post("/api/transactions/assess", response_model=AssessmentOut)
def assess(t: TransactionIn):
    """Stage 1: fast risk score. Very low -> APPROVE with no friction."""
    return orch.assess(t)


@app.post("/api/transactions/{tid}/verify", response_model=AssessmentOut)
def verify(tid: str, v: RecipientVerification):
    """Stage 2: after 'I WANT TO PAY' + mandatory form -> agentic analysis."""
    try:
        return orch.verify(tid, v)
    except KeyError:
        raise HTTPException(404, "unknown transaction")
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


@app.get("/api/audit")
def audit(): return orch.audit[-200:]


@app.get("/api/metrics")
def metrics():
    lat = sorted(a["latency_ms"] for a in orch.audit) or [0]
    return {"count": len(orch.audit), "p50_ms": lat[len(lat) // 2],
            "p95_ms": lat[max(int(len(lat) * 0.95) - 1, 0)]}
