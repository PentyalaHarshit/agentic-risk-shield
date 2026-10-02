"""History Agent: Evaluates customer transfer baseline, counterparty tenure, and account history."""

from typing import Dict, Any, List
from agents.evidence_types import HistoricalEvidenceModel


class HistoryAgent:
    name = "history_agent"

    def run(self, t, v=None) -> HistoricalEvidenceModel:
        prior_tx = getattr(t, "prior_tx_with_recipient", 0) or 0
        recip_age = getattr(t, "recipient_age_days", 180) or 180
        cust_age = getattr(t, "customer_account_age_days", 720) or 720
        avg_amt = getattr(t, "avg_amount_90d", 120.0) or 120.0

        has_prior = prior_tx > 0
        depth = min(1.0, (prior_tx * 0.15) + (recip_age / 1000.0) * 0.4)
        
        # Historical risk: high if new recipient + large deviation from baseline
        evidence = []
        if not has_prior:
            evidence.append("No prior successful transactions recorded with recipient")
        else:
            evidence.append(f"{prior_tx} successful prior transfer(s) on record")

        if recip_age < 30:
            evidence.append(f"Recipient account created recently ({recip_age} days ago)")
        elif recip_age > 365:
            evidence.append(f"Established counterparty account tenure ({recip_age} days)")

        if t.amount > avg_amt * 4.0:
            evidence.append(f"Transfer size (${t.amount:,.2f}) significantly exceeds historical 90-day average (${avg_amt:,.2f})")

        risk = 0.10 if (has_prior and recip_age > 180) else (0.65 if (not has_prior and recip_age < 30) else 0.35)

        return HistoricalEvidenceModel(
            prior_transactions=prior_tx,
            recipient_account_age_days=recip_age,
            customer_account_age_days=cust_age,
            avg_transfer_baseline=avg_amt,
            has_prior_relationship=has_prior,
            history_depth_score=round(depth, 3),
            historical_risk_score=round(risk, 3),
            evidence=evidence
        )
