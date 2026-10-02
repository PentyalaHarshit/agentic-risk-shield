"""Policy Engine: Maps calibrated risk scores and fused evidence to banking actions.

Enforces compliance rules and algorithmic guard-rails:
- Low risk (< 0.35) -> APPROVE
- Borderline / High risk (0.35 - 0.75) -> HOLD for human investigator
- Critical risk (>= 0.75) with hard corroborating evidence -> BLOCK
- Guardrail (POLICY-006): Weak signals / subjective agent opinions alone can NEVER BLOCK
"""

from typing import Dict, Any, List, Tuple
from agents.evidence_types import FusedEvidence
from rag.policy_retriever import PolicyRetriever


class PolicyEngine:
    def __init__(self):
        self.rag = PolicyRetriever()

    def evaluate_action(
        self,
        calibrated_score: float,
        fused: FusedEvidence,
        query_context: str
    ) -> Tuple[str, List[Dict[str, Any]], List[str]]:
        """Evaluates banking action, retrieves governing policies, and compiles justification."""
        # 1. Retrieve applicable policies via RAG
        policies = self.rag.search(query_context, k=3)
        
        # 2. Check for hard corroborating evidence (POLICY-006 guardrail)
        comm_sig = fused.communication_evidence.signals
        hard_secrecy_payment = comm_sig.get("secrecy") and comm_sig.get("payment_request")
        hard_impersonation = comm_sig.get("impersonation") and comm_sig.get("urgency", 0) > 0.6
        hard_scam_link = bool(comm_sig.get("suspicious_url"))
        extreme_velocity = fused.transaction_evidence.transfer_velocity >= 5
        
        has_hard_evidence = (
            hard_secrecy_payment
            or hard_impersonation
            or hard_scam_link
            or extreme_velocity
            or (fused.critical_flags_count >= 3)
        )

        reasons = []
        # Compile specific evidence citations
        if fused.transaction_evidence.amount_ratio > 3.0:
            reasons.append(f"Unusual transaction amount ({fused.transaction_evidence.amount_ratio:.1f}x typical 90-day baseline)")
        if not fused.historical_evidence.has_prior_relationship:
            reasons.append("No prior transfer history on record with this recipient")
        if fused.historical_evidence.recipient_account_age_days < 30:
            reasons.append(f"New recipient account ({fused.historical_evidence.recipient_account_age_days} days old)")
        if comm_sig.get("urgency", 0) > 0.4:
            reasons.append("Elevated urgency and rapid settlement demand in conversation")
        if comm_sig.get("secrecy"):
            reasons.append("Sender requested confidentiality or discouraged telling family/bank")
        if comm_sig.get("verification_discouragement"):
            reasons.append("Sender explicitly discouraged phone or video verification")
        if not fused.relationship_evidence.is_verified:
            reasons.append("Counterparty identity and relationship could not be verified")

        # 3. Action Decision Tree
        if calibrated_score < 0.35:
            action = "APPROVE"
        elif calibrated_score >= 0.75:
            if has_hard_evidence:
                action = "BLOCK"
            else:
                # Guardrail: without hard corroborating evidence, route to human investigator rather than blocking
                action = "HOLD"
                reasons.append("Elevated statistical risk without hard evidence — routed to Investigator Queue per POLICY-006")
        else:
            action = "HOLD"

        return action, policies, reasons
