"""Evidence Aggregator: Unifies Transaction, Communication, Relationship, and History Evidence.

Fuses multimodal evidence signals, computes inter-agent variance / disagreement,
and prepares normalized feature representations for calibrated ML scoring.
"""

import numpy as np
from typing import Dict, Any, List
from agents.evidence_types import (
    TransactionEvidence,
    CommunicationEvidenceModel,
    RelationshipEvidenceModel,
    HistoricalEvidenceModel,
    FusedEvidence
)


class EvidenceAggregator:
    def fuse(
        self,
        tid: str,
        tx_ev: TransactionEvidence,
        comm_ev: CommunicationEvidenceModel,
        rel_ev: RelationshipEvidenceModel,
        hist_ev: HistoricalEvidenceModel
    ) -> FusedEvidence:
        # Measure inter-agent variance across signals
        scores = [
            tx_ev.risk_indicator,
            comm_ev.evidence_strength if comm_ev.has_data else tx_ev.risk_indicator,
            rel_ev.risk_score,
            hist_ev.historical_risk_score
        ]
        disagreement = float(np.std(scores))

        # Count critical red flags across evidence
        critical_count = 0
        if tx_ev.amount_ratio > 5.0: critical_count += 1
        if tx_ev.is_new_device and tx_ev.failed_logins >= 2: critical_count += 1
        if comm_ev.signals.get("secrecy") and comm_ev.signals.get("payment_request"): critical_count += 1
        if comm_ev.signals.get("urgency", 0) > 0.7: critical_count += 1
        if not rel_ev.is_verified and not hist_ev.has_prior_relationship: critical_count += 1

        # Stage 2 feature vector:
        # STAGE1_FEATURES (8) + rel_verified, phone_known, location_ok, surname_ok, reason_risk, history_len, communication_signal (7)
        # Total = 15 features matching ml.risk_model.STAGE2_FEATURES
        s1_vec = list(tx_ev.vector)
        s2_features = [
            int(rel_ev.is_verified),
            int(rel_ev.phone_known),
            int(rel_ev.location_ok),
            int(rel_ev.surname_match),
            float(comm_ev.signals.get("urgency", 0.0) or 0.0),
            float(min(hist_ev.recipient_account_age_days, 500)),
            float(comm_ev.evidence_strength if comm_ev.has_data else 0.0)
        ]
        fused_vec = s1_vec + s2_features

        return FusedEvidence(
            transaction_id=tid,
            transaction_evidence=tx_ev,
            communication_evidence=comm_ev,
            relationship_evidence=rel_ev,
            historical_evidence=hist_ev,
            fused_risk_vector=fused_vec,
            inter_agent_disagreement_score=round(disagreement, 3),
            critical_flags_count=critical_count
        )
