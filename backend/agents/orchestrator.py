"""Research-Grade Multi-Agent Orchestrator: Two-Stage Adaptive Architecture.

Architecture:
Transaction Agent -> Transaction Evidence
Communication Agent -> Communication Evidence
Relationship Agent -> Relationship Evidence
History Agent -> Historical Evidence
        ↓
Evidence Aggregator (Fuses signals & measures agent disagreement)
        ↓
XGBoost Calibrated Model + SHAP TreeExplainer
        ↓
Policy Engine (RAG grounding & regulatory guardrails)
        ↓
Decision Agent (Transparent synthesis & human explainability)
"""

import os, uuid, time
from typing import Dict, Any, List, Optional
from agents.transaction_agent import TransactionAgent
from agents.fraud_agent import FraudAgent
from agents.relationship_agent import RelationshipAgent
from agents.communication_agent import CommunicationAgent
from agents.risk_agent import RiskAgent
from agents.history_agent import HistoryAgent
from agents.evidence_aggregator import EvidenceAggregator
from agents.policy_engine import PolicyEngine
from agents.decision_agent import DecisionAgent
from agents.evidence_types import (
    TransactionEvidence,
    CommunicationEvidenceModel,
    RelationshipEvidenceModel,
    HistoricalEvidenceModel
)
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
    "communication_signal": "Communication contains urgency / payment-request language",
    "failed_login_count": "Multiple failed login attempts before transfer"
}


class Orchestrator:
    def __init__(self):
        # 1. Specialized Evidence Gathering Agents
        self.tx_agent = TransactionAgent()
        self.comm_agent = CommunicationAgent()
        self.rel_agent = RelationshipAgent()
        self.hist_agent = HistoryAgent()
        
        # 2. Evidence Fusion & Statistical Model
        self.aggregator = EvidenceAggregator()
        self.fraud_agent = FraudAgent()
        self.risk_agent = RiskAgent()
        
        # 3. Policy & Decision Synthesis
        self.policy_engine = PolicyEngine()
        self.decision_agent = DecisionAgent()
        self.rag = PolicyRetriever()
        
        self.store = {}   # transaction_id -> state
        self.audit = []

    # ---------- Stage 1: Fast Adaptive Screening ----------
    def assess(self, t):
        tid = "TX-" + uuid.uuid4().hex[:6].upper()
        t0 = time.perf_counter()
        trace = []

        # 1. Transaction Agent: Fast vector & anomaly extraction
        a = self.tx_agent.run(t)
        trace.append({
            "step": 1,
            "agent": "Transaction Agent",
            "action": "transaction_agent",
            "summary": "Amount significantly differs from baseline" if a["flags"] else "Transaction parameters within normal baseline",
            "observation": a["flags"]
        })

        # 2. History Agent: Baseline & Tenure Analysis
        hist_model = self.hist_agent.run(t)
        trace.append({
            "step": 2,
            "agent": "History Agent",
            "action": "history_tenure_check",
            "summary": f"{hist_model.prior_transactions} prior tx on record | Recipient tenure: {hist_model.recipient_account_age_days}d",
            "observation": hist_model.evidence
        })

        # 3. XGBoost Stage 1 + SHAP TreeExplainer
        obs = self.fraud_agent.run(a["vector"], 1)
        p1 = round(float(obs["fraud_probability"]), 4)
        shap_factors = obs.get("shap_attributions", [])
        top_shap_desc = f"Primary driver: {shap_factors[0]['display_name']}" if shap_factors else "Baseline features normal"

        trace.append({
            "step": 3,
            "agent": "Risk Agent (XGBoost Stage 1 + SHAP)",
            "action": "xgboost_predict_shap",
            "summary": f"XGBoost baseline risk score: {p1:.2f} | {top_shap_desc}",
            "observation": {
                "fraud_probability": p1,
                "base_value": obs.get("base_value", 0.05),
                "shap_attributions": shap_factors[:4]
            }
        })

        # Data-driven adaptive thresholds:
        # Theta_low = 0.18 (Auto-Approve, zero customer friction)
        # Theta_high = 0.72 (Auto-Block / Stop, critical security)
        # Between 0.18 and 0.72 -> Stage 2 Verification Corridor
        if p1 < 0.18:
            decision = "APPROVE"
        elif p1 >= 0.72:
            decision = "BLOCK"
        else:
            decision = "REQUIRE_VERIFICATION"

        reasons = [FRIENDLY.get(f["feature"], f["feature"]) for f in obs["top_factors"] if f["feature"] in FRIENDLY]

        if decision != "APPROVE":
            q = "new recipient large transfer verification " + " ".join(a["flags"])
            policies = self.rag.search(q, k=2)
            trace.append({
                "step": 4,
                "agent": "RAG Policy Agent",
                "action": "search_fraud_policy",
                "summary": f"{', '.join(d['id'] for d in policies)} retrieved",
                "observation": [d["id"] for d in policies]
            })

        trace.append({
            "step": 5,
            "agent": "Decision Agent",
            "action": "decision_agent",
            "summary": f"Baseline risk: {p1:.3f} -> Decision: {decision}",
            "observation": decision
        })

        # Tiered status and customer-facing message
        if decision == "APPROVE":
            status = "APPROVED"
            tx_status = "COMPLETED"
            funds = True
            code = "LOW_RISK_APPROVED"
            msg = "Transaction approved. Your transfer has been processed successfully."
        elif decision == "REQUIRE_VERIFICATION":
            status = "AWAITING_VERIFICATION"
            tx_status = "PENDING_VERIFICATION"
            funds = False
            code = "ELEVATED_RISK_VERIFICATION"
            msg = "Additional recipient verification required before funds can be released."
        else:
            status = "BLOCKED"
            tx_status = "STOPPED"
            funds = False
            code = "CRITICAL_RISK"
            msg = (
                "TRANSFER STOPPED\n\n"
                "We couldn't complete this transfer because our security system detected critical risk indicators.\n\n"
                f"Amount: ${t.amount:,.2f}\n"
                f"Recipient: {t.recipient_name}\n\n"
                "Your funds were not transferred."
            )

        risk_breakdown = {
            "transaction_risk": p1,
            "communication_signal_strength": 0.0,
            "communication_risk": 0.0,
            "relationship_risk": 0.0,
            "history_risk": hist_model.historical_risk_score,
            "final_risk": p1
        }

        out = dict(
            transaction_id=tid,
            stage=1,
            risk_score=p1,
            decision=decision,
            status=status,
            transaction_status=tx_status,
            funds_transferred=funds,
            reason_code=code,
            customer_name=getattr(t, "customer_name", "Harshit P."),
            recipient_name=t.recipient_name,
            recipient_phone=getattr(t, "recipient_phone", None),
            amount=t.amount,
            message=msg,
            reasons=[] if decision == "APPROVE" else reasons,
            trace=trace,
            risk_breakdown=risk_breakdown,
            communication_evidence=None,
            shap_attributions=shap_factors,
            created_at=time.time()
        )
        self.store[tid] = {"tx": t, "stage1": out, "current": out, "history": [out]}
        self._log(tid, 1, decision, p1, time.perf_counter() - t0)
        return out

    # ---------- Stage 2: Deep Multi-Agent Forensics ----------
    def verify(self, tid, v):
        st = self.store.get(tid)
        if not st: raise KeyError(tid)
        t, t0, trace = st["tx"], time.perf_counter(), []

        # 1. Transaction Agent Evidence
        tx_eval = self.tx_agent.run(t)
        tx_ev = TransactionEvidence(
            amount=t.amount,
            amount_ratio=float(t.amount) / max(1.0, float(getattr(t, "avg_amount_90d", 120.0))),
            is_night=bool(getattr(t, "hour", 12) < 5 or getattr(t, "hour", 12) >= 23),
            is_new_device=bool(getattr(t, "new_device", False)),
            failed_logins=int(getattr(t, "failed_login_count", 0) or 0),
            transfer_velocity=int(getattr(t, "tx_last_24h", 0) or 0),
            flags=tx_eval["flags"],
            risk_indicator=round(float(st["stage1"]["risk_score"]), 4),
            vector=tx_eval["vector"]
        )
        trace.append({
            "step": 1,
            "agent": "Transaction Agent",
            "action": "transaction_agent",
            "summary": "Amount significantly differs from baseline" if tx_eval["flags"] else "Transaction velocity within pattern",
            "observation": tx_eval["flags"]
        })

        # 2. Communication Agent Evidence
        comm_text = v.communication_text or ("\n".join(v.shared_messages) if v.shared_messages else "")
        comm_analysis = self.comm_agent.analyze(
            channel=v.communication_channel or "WhatsApp",
            text=comm_text,
            relationship=v.relationship,
            reason=v.reason
        )
        comm_ev = CommunicationEvidenceModel(
            channel=comm_analysis["channel"],
            has_data=comm_analysis["has_data"],
            evidence_strength=comm_analysis["evidence_strength"],
            signals=comm_analysis["signals"],
            evidence=comm_analysis["evidence"],
            summary=comm_analysis["evidence"][0] if comm_analysis["evidence"] else "No hostile pressure detected"
        )
        trace.append({
            "step": 2,
            "agent": "Communication Agent",
            "action": "communication_agent",
            "summary": comm_ev.summary if comm_ev.has_data else "No communication excerpt provided (opt-in)",
            "observation": comm_analysis
        })

        # 3. Relationship Agent Evidence
        rel = self.rel_agent.run(v, t.recipient_name)
        rel_ev = RelationshipEvidenceModel(
            relationship_claimed=v.relationship,
            is_verified=bool(rel["vector"][0] and rel["vector"][3]),
            phone_known=bool(rel["vector"][1]),
            location_ok=bool(rel["vector"][2]),
            surname_match=bool(rel["vector"][3]),
            evidence=rel["evidence"],
            weak_signals=rel["weak_signals"],
            risk_score=0.15 if (rel["vector"][0] and rel["vector"][3]) else 0.65,
            vector=rel["vector"]
        )
        trace.append({
            "step": 3,
            "agent": "Relationship Agent",
            "action": "relationship_agent",
            "summary": "Recipient relationship verified" if rel_ev.is_verified else "Recipient relationship not sufficiently verified",
            "observation": {"evidence": rel["evidence"], "weak_signals": rel["weak_signals"]}
        })

        # 4. History Agent Evidence
        hist_ev = self.hist_agent.run(t, v)
        trace.append({
            "step": 4,
            "agent": "History Agent",
            "action": "historical_tenure",
            "summary": f"{hist_ev.prior_transactions} prior transfers recorded | Tenure: {hist_ev.recipient_account_age_days}d",
            "observation": hist_ev.evidence
        })

        # 5. Evidence Fusion & Inter-Agent Disagreement
        fused = self.aggregator.fuse(
            tid=tid,
            tx_ev=tx_ev,
            comm_ev=comm_ev,
            rel_ev=rel_ev,
            hist_ev=hist_ev
        )
        trace.append({
            "step": 5,
            "agent": "Evidence Aggregator",
            "action": "evidence_fusion",
            "summary": f"Fused 4 evidence streams | Inter-agent disagreement variance: {fused.inter_agent_disagreement_score:.2f}",
            "observation": {
                "critical_flags": fused.critical_flags_count,
                "disagreement": fused.inter_agent_disagreement_score
            }
        })

        # 6. Statistical ML Model (Stage 2 XGBoost + SHAP)
        obs = self.fraud_agent.run(fused.fused_risk_vector, 2)
        stage2_ml = round(float(obs["fraud_probability"]), 4)
        shap_factors = obs.get("shap_attributions", [])
        trace.append({
            "step": 6,
            "agent": "Risk Agent (Stage 2 XGBoost + SHAP)",
            "action": "xgboost_predict_shap(stage2)",
            "summary": f"Stage 2 ML risk score: {stage2_ml:.2f}",
            "observation": {
                "ml_probability": stage2_ml,
                "shap_factors": shap_factors[:4]
            }
        })

        # 7. Policy Engine (RAG Grounding + Regulatory Guardrails)
        query_parts = [v.reason] + rel["evidence"] + comm_analysis["evidence"]
        query_str = " ".join(query_parts)
        decision, policies, evidence_items = self.policy_engine.evaluate_action(
            calibrated_score=stage2_ml,
            fused=fused,
            query_context=query_str
        )
        policy_ids = [p["id"] for p in policies]
        trace.append({
            "step": 7,
            "agent": "Policy Engine (RAG Guardrails)",
            "action": "policy_guardrails",
            "summary": f"Policies {', '.join(policy_ids)} applied | Action: {decision}",
            "observation": policy_ids
        })

        # 8. Decision Agent (Transparent Customer/Manager Explanation)
        explanation = self.decision_agent.explain(
            tid=tid,
            action=decision,
            score=stage2_ml,
            amount=t.amount,
            recipient_name=t.recipient_name,
            evidence_items=evidence_items,
            policies=policies,
            shap_factors=shap_factors
        )
        trace.append({
            "step": 8,
            "agent": "Decision Agent",
            "action": "decision_agent",
            "summary": f"Synthesized final action: {decision}",
            "observation": decision
        })

        # Map decisions to Banking lifecycle
        if decision == "APPROVE":
            status = "APPROVED"
            tx_status = "COMPLETED"
            funds = True
            code = "STAGE2_APPROVED"
        elif decision == "BLOCK":
            status = "BLOCKED"
            tx_status = "STOPPED"
            funds = False
            code = "CRITICAL_RISK"
        else:  # HOLD -> Enters Bank Review Queue
            status = "ON_HOLD"
            tx_status = "AWAITING_REVIEW"
            funds = False
            code = "SECURITY_HOLD"

        if decision != "APPROVE":
            self.rag.add_feedback(f"{tid}: {decision}; reasons={evidence_items}")

        risk_breakdown = {
            "transaction_risk": tx_ev.risk_indicator,
            "communication_signal_strength": comm_ev.evidence_strength,
            "communication_risk": comm_ev.evidence_strength,
            "relationship_risk": rel_ev.risk_score,
            "history_risk": hist_ev.historical_risk_score,
            "final_risk": stage2_ml
        }

        comm_evidence_out = {
            "channel": comm_analysis["channel"],
            "signals": comm_analysis["signals"],
            "evidence_strength": comm_ev.evidence_strength,
            "evidence": comm_analysis["evidence"],
            "urgency_score": comm_analysis["urgency_score"],
            "payment_request_detected": comm_analysis["payment_request_detected"],
            "impersonation_indicator": comm_analysis["impersonation_indicator"],
            "suspicious_link_detected": comm_analysis["suspicious_link_detected"],
            "pressure_indicator": comm_analysis["pressure_indicator"],
            "communication_risk": comm_ev.evidence_strength
        } if comm_analysis["has_data"] else None

        out = dict(
            transaction_id=tid,
            stage=2,
            risk_score=stage2_ml,
            decision=decision,
            status=status,
            transaction_status=tx_status,
            funds_transferred=funds,
            reason_code=code,
            customer_name=getattr(t, "customer_name", "Harshit P."),
            recipient_name=t.recipient_name,
            recipient_phone=getattr(t, "recipient_phone", None),
            amount=t.amount,
            message=explanation,
            reasons=evidence_items if decision != "APPROVE" else [],
            trace=trace,
            risk_breakdown=risk_breakdown,
            communication_evidence=comm_evidence_out,
            shap_attributions=shap_factors,
            manager_decision=None,
            created_at=time.time()
        )
        st["stage2"] = out
        st["current"] = out
        st["history"].append(out)
        self._log(tid, 2, decision, stage2_ml, time.perf_counter() - t0)
        return out

    # ---------- Bank Manager Review Queue & Decision ----------
    def get_manager_queue(self):
        """Returns transactions on HOLD awaiting bank manager investigation."""
        queue = []
        for tid, data in self.store.items():
            curr = data.get("current", {})
            if curr.get("status") == "ON_HOLD" or curr.get("transaction_status") == "AWAITING_REVIEW":
                queue.append(curr)
        queue.sort(key=lambda x: -x.get("created_at", 0))
        return queue

    def get_transaction(self, tid: str):
        st = self.store.get(tid)
        if not st: return None
        return st.get("current")

    def process_manager_decision(self, tid: str, action: str, manager_name: str = "Operations Manager", notes: str = None):
        st = self.store.get(tid)
        if not st:
            raise KeyError(tid)

        curr = st["current"]
        ts = time.time()
        mgr_record = {
            "action": action,
            "manager_name": manager_name,
            "notes": notes or f"Investigation concluded by {manager_name}",
            "decided_at": ts
        }

        if action == "APPROVE":
            curr["status"] = "APPROVED_BY_MANAGER"
            curr["transaction_status"] = "APPROVED_BY_MANAGER"
            curr["funds_transferred"] = True
            curr["message"] = (
                f"TRANSFER APPROVED BY BANK MANAGER\n\n"
                f"Investigation complete. Transfer of ${curr['amount']:,.2f} to {curr['recipient_name']} has been approved and processed.\n\n"
                f"Manager Notes: {mgr_record['notes']}"
            )
        elif action == "DENY":
            curr["status"] = "DENIED_BY_MANAGER"
            curr["transaction_status"] = "STOPPED"
            curr["funds_transferred"] = False
            curr["reason_code"] = "MANAGER_DENIED"
            curr["message"] = (
                f"TRANSFER STOPPED BY BANK INVESTIGATION\n\n"
                f"Following security investigation, this transfer was stopped to prevent unauthorized fund loss.\n\n"
                f"Your funds were not transferred.\n"
                f"Manager Notes: {mgr_record['notes']}"
            )
        else:  # REQUEST_INFO
            curr["status"] = "INFO_REQUESTED"
            curr["transaction_status"] = "AWAITING_CUSTOMER_INFO"
            curr["message"] = (
                f"ADDITIONAL INFORMATION REQUESTED\n\n"
                f"The bank fraud team has requested phone confirmation before proceeding.\n\n"
                f"Notes: {mgr_record['notes']}"
            )

        curr["manager_decision"] = mgr_record
        st["history"].append(dict(curr))
        return curr

    def _log(self, tid, stage, decision, score, secs):
        self.audit.append({"tx": tid, "stage": stage, "decision": decision,
                           "score": score, "latency_ms": round(secs * 1000, 2), "ts": time.time()})
