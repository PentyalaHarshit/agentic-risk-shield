"""ReAct-style orchestrator: Action(tool) -> Observation, with a stored concise trace.
Only decision evidence is logged (no hidden chain-of-thought)."""
import os, uuid, time
from agents.transaction_agent import TransactionAgent
from agents.fraud_agent import FraudAgent
from agents.relationship_agent import RelationshipAgent
from agents.communication_agent import CommunicationAgent
from agents.risk_agent import RiskAgent
from rag.policy_retriever import PolicyRetriever

FRIENDLY = {
    "amount_ratio": "Unusual transaction amount compared to typical pattern",
    "prior_tx": "No prior transaction history with this recipient",
    "recipient_age_days": "New recipient account",
    "fraud_reports": "Recipient account is linked to previous fraud reports",
    "new_device": "Transfer initiated from an unrecognized device",
    "night": "Transfer submitted at an unusual hour",
    "tx_last_24h": "Elevated transfer velocity in the last 24 hours",
    "amount": "High transaction value",
    "rel_verified": "Recipient relationship could not be sufficiently verified",
    "phone_known": "Phone number could not be linked to your contacts",
    "location_ok": "Recipient location could not be confirmed",
    "surname_ok": "Recipient name details did not fully match transfer records",
    "reason_risk": "Payment reason contains high-risk scam indicators",
    "history_len": "Little history with this recipient was provided",
    "message_risk": "Communication contains urgency / payment-request language",
}


class Orchestrator:
    def __init__(self):
        self.tx_agent, self.fraud_agent = TransactionAgent(), FraudAgent()
        self.rel_agent, self.risk_agent = RelationshipAgent(), RiskAgent()
        self.comm_agent = CommunicationAgent()
        self.rag = PolicyRetriever()
        self.store = {}   # transaction_id -> state (use PostgreSQL in production)
        self.audit = []

    # ---------- Stage 1 ----------
    def assess(self, t):
        tid = "TX" + uuid.uuid4().hex[:8].upper()
        t0 = time.perf_counter(); trace = []
        a = self.tx_agent.run(t)
        trace.append({
            "step": 1,
            "agent": "Transaction Agent",
            "action": "transaction_agent",
            "summary": "Amount significantly differs from baseline" if a["flags"] else "Transaction parameters within normal baseline",
            "observation": a["flags"]
        })

        obs = self.fraud_agent.run(a["vector"], 1)
        p1 = round(float(obs["fraud_probability"]), 4)
        trace.append({
            "step": 2,
            "agent": "Risk Agent (XGBoost Stage 1)",
            "action": "xgboost_predict",
            "summary": f"XGBoost baseline risk score: {p1:.2f}",
            "observation": obs
        })

        decision = self.risk_agent.stage1(obs["fraud_probability"])
        reasons = [FRIENDLY[f["feature"]] for f in obs["top_factors"] if f["feature"] in FRIENDLY]
        if decision != "APPROVE":
            q = "new recipient large transfer verification " + " ".join(a["flags"])
            policies = self.rag.search(q, k=2)
            trace.append({
                "step": 3,
                "agent": "RAG Policy Agent",
                "action": "search_fraud_policy",
                "summary": f"{', '.join(d['id'] for d in policies)} retrieved",
                "observation": [d["id"] for d in policies]
            })

        trace.append({
            "step": 4,
            "agent": "Decision Agent",
            "action": "decision_agent",
            "summary": f"Baseline risk: {p1:.3f} → Decision: {decision}",
            "observation": decision
        })

        msgs = {
            "APPROVE": "Transaction approved.",
            "REQUIRE_VERIFICATION": "Additional verification required. Click 'I want to pay' to continue.",
            "HOLD": "Transaction held for review due to critical risk."
        }

        risk_breakdown = {
            "transaction_risk": p1,
            "communication_signal_strength": 0.0,
            "communication_risk": 0.0,
            "relationship_risk": 0.0,
            "history_risk": 0.0,
            "final_risk": p1
        }

        out = dict(transaction_id=tid, stage=1, risk_score=p1,
                   decision=decision, message=msgs[decision],
                   reasons=[] if decision == "APPROVE" else reasons, trace=trace,
                   risk_breakdown=risk_breakdown, communication_evidence=None)
        self.store[tid] = {"tx": t, "stage1": out}
        self._log(tid, 1, decision, p1, time.perf_counter() - t0)
        return out

    # ---------- Stage 2 ----------
    def verify(self, tid, v):
        st = self.store.get(tid)
        if not st: raise KeyError(tid)
        if st["stage1"]["decision"] != "REQUIRE_VERIFICATION":
            raise ValueError("Transaction does not require verification")
        t, t0, trace = st["tx"], time.perf_counter(), []

        # 1. Transaction Agent summary
        tx_eval = self.tx_agent.run(t)
        tx_summary = "Amount significantly differs from baseline" if tx_eval["flags"] else "Transaction velocity monitored"
        trace.append({
            "step": 1,
            "agent": "Transaction Agent",
            "action": "transaction_agent",
            "summary": tx_summary,
            "observation": tx_eval["flags"]
        })

        # 2. Communication Agent
        comm_text = v.communication_text or ("\n".join(v.shared_messages) if v.shared_messages else "")
        comm_analysis = self.comm_agent.analyze(
            channel=v.communication_channel or "WhatsApp",
            text=comm_text,
            relationship=v.relationship,
            reason=v.reason
        )

        if comm_analysis["has_data"]:
            signals_found = []
            sig = comm_analysis["signals"]
            if sig.get("payment_request"): signals_found.append("Payment solicitation")
            if sig.get("urgency", 0) > 0.4: signals_found.append("urgency")
            if sig.get("impersonation"): signals_found.append("impersonation")
            if sig.get("secrecy"): signals_found.append("secrecy")
            if sig.get("verification_discouragement"): signals_found.append("call discouragement")
            if sig.get("suspicious_url"): signals_found.append("suspicious link")
            comm_summary = (" + ".join(signals_found[:2]) + " detected") if signals_found else "Communication signals analyzed (low risk)"
        else:
            comm_summary = "No communication excerpt provided (opt-in)"

        trace.append({
            "step": 2,
            "agent": "Communication Agent",
            "action": "communication_agent",
            "summary": comm_summary,
            "observation": comm_analysis
        })

        # 3. Relationship Agent
        rel = self.rel_agent.run(v, t.recipient_name)
        rel_summary = "Recipient relationship not sufficiently verified" if rel["weak_signals"] else "Recipient relationship verified"
        trace.append({
            "step": 3,
            "agent": "Relationship Agent",
            "action": "relationship_agent",
            "summary": rel_summary,
            "observation": {"evidence": rel["evidence"], "weak_signals": rel["weak_signals"]}
        })

        # 4. Risk Agent (XGBoost Stage 2)
        vec = tx_eval["vector"] + rel["vector"]
        obs = self.fraud_agent.run(vec, 2)
        stage2_ml = round(float(obs["fraud_probability"]), 4)
        trace.append({
            "step": 4,
            "agent": "Risk Agent",
            "action": "xgboost_predict(stage2)",
            "summary": f"XGBoost risk score: {stage2_ml:.2f}",
            "observation": obs
        })

        # 5. RAG Policy Agent
        query_parts = [v.reason] + rel["evidence"] + rel["weak_signals"] + comm_analysis["evidence"]
        query = " ".join(query_parts)
        policies = self.rag.search(query, k=3)
        policy_ids = [p["id"] for p in policies]
        trace.append({
            "step": 5,
            "agent": "RAG Policy Agent",
            "action": "search_fraud_policy",
            "summary": f"{', '.join(policy_ids)} retrieved",
            "observation": policy_ids
        })

        # 6. Multi-Factor Decomposition & Decision
        tx_risk = round(float(st["stage1"]["risk_score"]), 4)
        comm_strength = round(float(comm_analysis["evidence_strength"]), 4)

        rel_ok = bool(rel["vector"][0] and rel["vector"][3])
        rel_mismatch = bool(rel["vector"][3] == 0)
        rel_risk = 0.15 if rel_ok else (0.65 if rel_mismatch else 0.35)

        prior_known = t.prior_tx_with_recipient > 0
        hist_len = rel["vector"][5]
        hist_risk = 0.10 if (prior_known and hist_len >= 40) else (0.65 if (not prior_known and hist_len < 25) else 0.35)

        # Signal combination
        if comm_analysis["has_data"]:
            combined = (0.35 * stage2_ml) + (0.35 * comm_strength) + (0.15 * rel_risk) + (0.15 * hist_risk)
        else:
            combined = (0.60 * stage2_ml) + (0.20 * rel_risk) + (0.20 * hist_risk)
        score = round(min(1.0, max(0.0, combined)), 4)

        hard_comm = (comm_analysis["signals"].get("secrecy") and comm_analysis["signals"].get("payment_request")) or (comm_strength >= 0.75)
        hard = bool(rel["evidence"]) or hard_comm or (t.recipient_fraud_reports > 0)
        decision = self.risk_agent.stage2(score, hard)

        trace.append({
            "step": 6,
            "agent": "Decision Agent",
            "action": "decision_agent",
            "summary": f"Combined risk: {score:.3f} -> Decision: {decision}",
            "observation": decision
        })

        # Compile evidence bullets
        evidence_items = []
        for f in obs["top_factors"]:
            feat = f.get("feature")
            if feat in FRIENDLY and FRIENDLY[feat] not in evidence_items:
                evidence_items.append(FRIENDLY[feat])
        for e in rel["evidence"]:
            if e not in evidence_items: evidence_items.append(e)

        # Add explicit clean communication bullets
        sig = comm_analysis.get("signals", {})
        if sig.get("urgency", 0) >= 0.4 and "Strong payment urgency" not in evidence_items:
            evidence_items.append("Strong payment urgency")
        if sig.get("secrecy") and "Communication contains secrecy language" not in evidence_items:
            evidence_items.append("Communication contains secrecy language")
        if sig.get("impersonation") and "Communication contains impersonation cues" not in evidence_items:
            evidence_items.append("Communication contains impersonation cues")
        if sig.get("verification_discouragement") and "Sender discourages voice or video verification" not in evidence_items:
            evidence_items.append("Sender discourages voice or video verification")
        if sig.get("suspicious_url") and "Suspicious link detected in message" not in evidence_items:
            evidence_items.append("Suspicious link detected in message")

        if rel_risk >= 0.40 and "Recipient relationship could not be verified" not in evidence_items:
            evidence_items.append("Recipient relationship could not be verified")

        explanation = self._explain(decision, score, evidence_items, rel["weak_signals"], policies, comm_analysis)
        if decision != "APPROVE":
            self.rag.add_feedback(f"{tid}: {decision}; reasons={evidence_items}")

        risk_breakdown = {
            "transaction_risk": tx_risk,
            "communication_signal_strength": comm_strength,
            "communication_risk": comm_strength,
            "relationship_risk": rel_risk,
            "history_risk": hist_risk,
            "final_risk": score
        }

        comm_evidence_out = {
            "channel": comm_analysis["channel"],
            "signals": comm_analysis["signals"],
            "evidence_strength": comm_strength,
            "evidence": comm_analysis["evidence"],
            "urgency_score": comm_analysis["urgency_score"],
            "payment_request_detected": comm_analysis["payment_request_detected"],
            "impersonation_indicator": comm_analysis["impersonation_indicator"],
            "suspicious_link_detected": comm_analysis["suspicious_link_detected"],
            "pressure_indicator": comm_analysis["pressure_indicator"],
            "communication_risk": comm_strength
        } if comm_analysis["has_data"] else None

        out = dict(transaction_id=tid, stage=2, risk_score=score, decision=decision,
                   message=explanation, reasons=evidence_items if decision != "APPROVE" else [],
                   trace=trace, risk_breakdown=risk_breakdown, communication_evidence=comm_evidence_out)
        st["stage2"] = out
        self._log(tid, 2, decision, score, time.perf_counter() - t0)
        return out

    # ---------- XAI explanation (Research-Defensible Grounded Format) ----------
    def _explain(self, decision, score, evidence_items, weak, policies, comm=None):
        if decision == "APPROVE":
            return "Transaction approved after verification."

        risk_level = "CRITICAL RISK" if decision == "BLOCK" else "HIGH RISK"
        action_status = "Transaction blocked." if decision == "BLOCK" else "Transaction held for review."

        lines = [
            risk_level,
            action_status,
            "",
            "Evidence:"
        ]
        for e in evidence_items[:6]:
            lines.append(f"• {e}")

        lines.extend([
            "",
            "Action:",
            "Verify the recipient through a trusted channel."
        ])

        if policies:
            lines.extend([
                "",
                "Policies applied:"
            ])
            for p in policies[:3]:
                lines.append(f"• {p['id']} {p['title']}")

        lines.extend([
            "",
            "This is a risk assessment, not a finding that the recipient is a scammer."
        ])

        txt = "\n".join(lines)

        key = os.getenv("ANTHROPIC_API_KEY")
        if key:
            try:
                import anthropic
                c = anthropic.Anthropic(api_key=key)
                r = c.messages.create(
                    model=os.getenv("LLM_MODEL", "claude-sonnet-4-5"),
                    max_tokens=500,
                    messages=[{"role": "user", "content":
                        "Format this fraud review notice cleanly without altering facts, accusations, or policy references:\n\n" + txt}]
                )
                return r.content[0].text
            except Exception:
                pass
        return txt

    def _log(self, tid, stage, decision, score, secs):
        self.audit.append({"tx": tid, "stage": stage, "decision": decision,
                           "score": score, "latency_ms": round(secs * 1000, 2), "ts": time.time()})
