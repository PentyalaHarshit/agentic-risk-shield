from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Decision(str, Enum):
    APPROVE = "APPROVE"
    REQUIRE_VERIFICATION = "REQUIRE_VERIFICATION"  # shows the "I want to pay" button
    HOLD = "HOLD"                                  # critical risk, held for review
    BLOCK = "BLOCK"


class RecipientProfile(BaseModel):
    recipient_id: str
    internal_user_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    full_name: str
    phone: str
    masked_phone: str
    email: str
    masked_email: str
    location: str
    account_age_days: int = 365
    phone_verified: bool = True
    account_verified: bool = True
    is_new_recipient: bool = False
    prior_transfers: int = 0
    fraud_reports: int = 0
    account_status: Optional[str] = "ACTIVE"


class RecipientLookupIn(BaseModel):
    query: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    sender_user_id: Optional[str] = "harshit"


class TransactionIn(BaseModel):
    user_id: str = "U-8821"
    customer_name: Optional[str] = "Harshit P."
    recipient_id: Optional[str] = None
    recipient_user_id: Optional[int] = None
    recipient_name: str
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    amount: float = Field(gt=0)
    # Behavioural / account features (normally from the financial service DB or stream)
    avg_amount_90d: float = 100.0
    recipient_age_days: int = 0
    prior_tx_with_recipient: int = 0
    tx_last_24h: int = 0
    hour: int = 12
    new_device: bool = False
    recipient_fraud_reports: int = 0


class CommunicationAnalysisIn(BaseModel):
    channel: str = "WhatsApp"
    description: str
    relationship: Optional[str] = None
    reason: Optional[str] = None


class CommunicationSignals(BaseModel):
    urgency: float = 0.0
    payment_request: bool = False
    impersonation: bool = False
    secrecy: bool = False
    verification_discouragement: bool = False
    suspicious_url: bool = False


class CommunicationEvidence(BaseModel):
    channel: str
    signals: CommunicationSignals
    evidence_strength: float
    evidence: List[str] = []
    # Compatibility fields
    urgency_score: Optional[float] = None
    payment_request_detected: Optional[bool] = None
    impersonation_indicator: Optional[bool] = None
    suspicious_link_detected: Optional[bool] = None
    pressure_indicator: Optional[bool] = None
    communication_risk: Optional[float] = None


class RiskBreakdown(BaseModel):
    transaction_risk: float
    communication_signal_strength: float
    relationship_risk: float
    history_risk: float
    final_risk: float
    communication_risk: Optional[float] = None


class RecipientVerification(BaseModel):
    """Mandatory form shown after the user clicks 'I WANT TO PAY'."""
    name: str = Field(min_length=2)
    age: int = Field(ge=0, le=120)
    location: str = Field(min_length=2)
    phone: str = Field(min_length=5)
    relationship: str = Field(min_length=2)          # friend / family / other
    how_do_you_know: str = Field(min_length=3)
    history: str = Field(min_length=3)               # history with this person
    reason: str = Field(min_length=3)                # reason for payment

    # Communication Evidence (WhatsApp, iMessage, Telegram, Signal, Other)
    communication_channel: Optional[str] = "WhatsApp"
    communication_text: Optional[str] = None

    # Optional prior fields
    shared_messages: Optional[List[str]] = None
    # Context the service already knows (mocked in the prototype)
    user_surname: Optional[str] = None
    user_location: Optional[str] = None
    phone_in_user_contacts: Optional[bool] = None


class ManagerDecisionIn(BaseModel):
    action: str  # "APPROVE" | "DENY" | "REQUEST_INFO"
    manager_name: Optional[str] = "Operations Manager"
    notes: Optional[str] = None


class AssessmentOut(BaseModel):
    transaction_id: str
    stage: int
    risk_score: float
    decision: Decision
    status: str = "PENDING"
    transaction_status: str = "PROCESSING"
    funds_transferred: bool = False
    reason_code: Optional[str] = None
    customer_name: Optional[str] = "Harshit P."
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    amount: Optional[float] = None
    message: str
    reasons: List[str] = []
    trace: List[Dict[str, Any]] = []
    risk_breakdown: Optional[RiskBreakdown] = None
    communication_evidence: Optional[CommunicationEvidence] = None
    manager_decision: Optional[Dict[str, Any]] = None
    shap_attributions: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[float] = None
