"""Typed Evidence Schemas for Multi-Agent Forensics.

Enforces clear architectural separation:
1. Agents gather and interpret domain-specific evidence
2. Aggregator unifies signals into fused representation
3. Statistical model calculates calibrated numerical risk
4. Policy Engine determines banking action
5. Decision Agent generates transparent human explanation
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class TransactionEvidence(BaseModel):
    agent_name: str = "Transaction Agent"
    amount: float
    amount_ratio: float
    is_night: bool
    is_new_device: bool
    failed_logins: int
    transfer_velocity: int
    flags: List[str] = Field(default_factory=list)
    risk_indicator: float = Field(0.0, description="Normalized transaction anomaly score [0.0, 1.0]")
    vector: List[float] = Field(default_factory=list)

class CommunicationEvidenceModel(BaseModel):
    agent_name: str = "Communication Agent"
    channel: str
    has_data: bool
    evidence_strength: float = Field(0.0, description="Conversational threat score [0.0, 1.0]")
    signals: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[str] = Field(default_factory=list)
    summary: str = ""

class RelationshipEvidenceModel(BaseModel):
    agent_name: str = "Relationship Agent"
    relationship_claimed: str
    is_verified: bool
    phone_known: bool
    location_ok: bool
    surname_match: bool
    evidence: List[str] = Field(default_factory=list)
    weak_signals: List[str] = Field(default_factory=list)
    risk_score: float = Field(0.0, description="Relational discrepancy score [0.0, 1.0]")
    vector: List[float] = Field(default_factory=list)

class HistoricalEvidenceModel(BaseModel):
    agent_name: str = "History Agent"
    prior_transactions: int
    recipient_account_age_days: int
    customer_account_age_days: int
    avg_transfer_baseline: float
    has_prior_relationship: bool
    history_depth_score: float = Field(0.0, description="Normalized familiarity score [0.0, 1.0]")
    historical_risk_score: float = Field(0.0, description="Historical suspicion score [0.0, 1.0]")
    evidence: List[str] = Field(default_factory=list)

class FusedEvidence(BaseModel):
    transaction_id: str
    transaction_evidence: TransactionEvidence
    communication_evidence: CommunicationEvidenceModel
    relationship_evidence: RelationshipEvidenceModel
    historical_evidence: HistoricalEvidenceModel
    fused_risk_vector: List[float]
    inter_agent_disagreement_score: float
    critical_flags_count: int
