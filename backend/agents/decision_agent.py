"""Decision Agent: Synthesizes final decision into transparent, customer-facing explanations.

Ensures explainability and regulatory compliance (POLICY-007, POLICY-010):
- Explains specific factors without accusing the customer
- Grounded in retrieved compliance policies and SHAP feature importance
- Provides explicit next steps for release or appeal
"""

from typing import Dict, Any, List

class DecisionAgent:
    name = "decision_agent"

    def explain(
        self,
        tid: str,
        action: str,
        score: float,
        amount: float,
        recipient_name: str,
        evidence_items: List[str],
        policies: List[Dict[str, Any]],
        shap_factors: List[Dict[str, Any]]
    ) -> str:
        policy_ids = [p["id"] for p in policies]
        policy_str = ", ".join(policy_ids) if policy_ids else "POLICY-001"

        if action == "APPROVE":
            return (
                f"Transfer of ${amount:,.2f} to {recipient_name} approved. "
                "All verification checks passed with acceptable baseline risk."
            )

        if action == "BLOCK":
            bullets = "\n".join([f"• {e}" for e in evidence_items[:4]])
            return (
                "TRANSFER STOPPED (CRITICAL SECURITY RISK)\n\n"
                f"We couldn't complete this transfer of ${amount:,.2f} to {recipient_name} "
                "because multiple high-risk fraud indicators were detected:\n\n"
                f"{bullets}\n\n"
                f"Governing Bank Policy: {policy_str}\n"
                "Your funds were NOT transferred and your account remains secure. "
                "If you believe this is an error, please contact Bank Fraud Support."
            )

        # Action: HOLD (Human review queue)
        bullets = "\n".join([f"• {e}" for e in evidence_items[:5]]) or "• Elevated risk score requires human verification"
        
        top_shap_str = ""
        if shap_factors:
            top_feat = shap_factors[0].get("display_name", shap_factors[0].get("feature", "Risk factor"))
            top_shap_str = f"Primary algorithmic driver: {top_feat}."

        return (
            "SECURITY HOLD: SENT FOR INVESTIGATOR REVIEW\n\n"
            f"Your transfer of ${amount:,.2f} to {recipient_name} is temporarily paused "
            f"for verification under {policy_str}.\n\n"
            "Key factors flagged:\n"
            f"{bullets}\n\n"
            f"{top_shap_str} A bank operations manager is actively reviewing this case. "
            "You do not need to resend the transfer."
        )
