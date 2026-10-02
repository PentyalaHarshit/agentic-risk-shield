"""Empirical Failure Analysis Suite for Multi-Agent Financial Risk Systems.

Documents, categorizes, and provides root-cause post-mortems for edge cases where
statistical models, multi-agent swarms, RAG retrievers, or human review disagree.

Failure Taxonomy:
1. False Positive (Type I Error): Legitimate high-stakes transfer flagged as fraud
2. False Negative (Type II Error): Evasive fraud mimicking historical baseline
3. Multi-Agent Disagreement: Inter-agent conflict (e.g. Communication vs Transaction Agent)
4. RAG Semantic Collision: Irrelevant policy retrieved due to lexical overlap
5. Human Review Divergence: Model recommends HOLD, investigator overrules to APPROVE
"""

from typing import List, Dict, Any

FAILURE_CASES: List[Dict[str, Any]] = [
    {
        "id": "FAIL-001",
        "category": "False Positive (Benign Outlier)",
        "severity": "Medium Friction",
        "title": "Known Recipient Wedding Gift / Home Downpayment",
        "scenario": {
            "customer": "Sarah Jenkins (Account age: 1,420 days)",
            "recipient": "Michael Jenkins (Brother, 3 prior transfers)",
            "amount": 14500.00,
            "avg_amount_90d": 180.00,
            "ratio": 80.5,
            "channel": "iMessage",
            "communication_text": "Hey Sarah, here is my bank info for the house downpayment closing tomorrow! Thank you so much for helping us out.",
            "ground_truth": "LEGITIMATE (Genuine family gift)"
        },
        "system_trace": {
            "stage1_score": 0.88,
            "stage1_decision": "STOP / HIGH_RISK",
            "transaction_agent": "Flags: Extreme amount ratio (>80x 90d baseline), unusual single transfer size",
            "communication_agent": "Flags: 'tomorrow' flagged as urgency cue (0.42 urgency score)",
            "relationship_agent": "Verified: Surnames match (Jenkins), recipient in contact list",
            "rag_retrieval": ["POLICY-004: Urgency and pressure", "POLICY-001: Risk thresholds"],
            "model_decision": "HOLD (Score: 0.72)"
        },
        "root_cause_analysis": "The Stage 1 XGBoost model placed overwhelming weight on the 80x amount ratio relative to Sarah's modest 90-day history. In addition, the Communication Agent's urgency detector had a false lexical hit on 'closing tomorrow' (a real-estate closing deadline, not malicious pressure).",
        "mitigation_strategy": "Implement contextual relation weighting: When Relationship Agent confirms matched family surnames and longstanding KYC contact history, damp the amount-ratio penalty and require semantic confirmation of coercive urgency before triggering a hard stop."
    },
    {
        "id": "FAIL-002",
        "category": "False Negative (Evasive Fraud)",
        "severity": "Critical Risk Exposure",
        "title": "Low-Value Smurfing Mimicking Grocery Bill",
        "scenario": {
            "customer": "David Miller (Account age: 620 days)",
            "recipient": "Apex Retail Solutions (New recipient, age: 3 days)",
            "amount": 87.50,
            "avg_amount_90d": 92.00,
            "ratio": 0.95,
            "channel": "SMS",
            "communication_text": "Your package delivery #49281 fee is $87.50. Please confirm payment.",
            "ground_truth": "FRAUD (Phishing / Fake delivery fee scam)"
        },
        "system_trace": {
            "stage1_score": 0.08,
            "stage1_decision": "APPROVE (VERY LOW RISK)",
            "transaction_agent": "Within normal amount baseline ($87.50 vs $92.00 avg)",
            "communication_agent": "Bypassed (Stage 1 Auto-Approve, customer never prompted for communication)",
            "relationship_agent": "Bypassed",
            "rag_retrieval": [],
            "model_decision": "AUTO-APPROVED"
        },
        "root_cause_analysis": "The fraudster deliberately crafted the transfer amount to mirror the victim's typical debit card transactions ($87.50). Because the amount ratio was 0.95 and no failed logins occurred, Stage 1 classified it below theta_low (0.15) and auto-approved the payment without invoking Stage 2 communication inspection.",
        "mitigation_strategy": "Introduce behavioral recipient novelty checks in Stage 1: Even if the amount is low, if the recipient account was created < 5 days ago and is an unverified commercial merchant entity, elevate the Stage 1 risk score into the Stage 2 verification corridor."
    },
    {
        "id": "FAIL-003",
        "category": "Multi-Agent Disagreement (Inter-Agent Conflict)",
        "severity": "Operational Indecision",
        "title": "High Urgency Memo with Verified Counterparty",
        "scenario": {
            "customer": "Elena Rostova",
            "recipient": "Marcus Vance (Business Partner, 18 prior transactions)",
            "amount": 4200.00,
            "avg_amount_90d": 3800.00,
            "ratio": 1.10,
            "channel": "Telegram",
            "communication_text": "URGENT URGENT! The server hosting contract expires in 1 hour. Transfer $4,200 immediately or all production clusters go offline! Do not delay!",
            "ground_truth": "LEGITIMATE (Genuine production infrastructure emergency)"
        },
        "system_trace": {
            "stage1_score": 0.28,
            "stage1_decision": "REQUIRE_VERIFICATION",
            "transaction_agent": "LOW RISK (Amount ratio 1.1x, 18 successful prior transfers over 2 years)",
            "communication_agent": "CRITICAL RISK (0.94 score: extreme urgency '1 hour', capitalization, panic cue)",
            "relationship_agent": "VERY LOW RISK (Verified business partner, consistent corporate history)",
            "rag_retrieval": ["POLICY-004: Urgency and pressure"],
            "model_decision": "HOLD (Score: 0.64 - High Agent Variance)"
        },
        "root_cause_analysis": "The Communication Agent and Transaction/Relationship Agents reached opposite extremes: Comm Agent saw acute panic cues and scored 0.94, while Relationship Agent saw 18 prior transfers and scored 0.10. Simple weighted averaging produced a murky 0.64 score, leaving investigators without a confident verdict.",
        "mitigation_strategy": "Implement an explicit Disagreement Resolution Protocol in the Evidence Aggregator: When agent variance exceeds 0.70, calculate historical counterparty trust scores. High trust over 18 prior transactions modulates conversational panic flags as operational urgency rather than fraud."
    },
    {
        "id": "FAIL-004",
        "category": "RAG Semantic Collision",
        "severity": "Compliance Hallucination",
        "title": "Lexical Keyword Overlap on 'Gift Card' Restaurant Promo",
        "scenario": {
            "customer": "Robert Chen",
            "recipient": "Bistro Bella Donna (Local restaurant)",
            "amount": 250.00,
            "avg_amount_90d": 120.00,
            "ratio": 2.08,
            "channel": "WhatsApp",
            "communication_text": "Here is the payment for our dining gift card anniversary certificate",
            "ground_truth": "LEGITIMATE (Restaurant gift voucher)"
        },
        "system_trace": {
            "stage1_score": 0.24,
            "stage1_decision": "REQUIRE_VERIFICATION",
            "transaction_agent": "Moderate amount ratio (2.08x)",
            "communication_agent": "Flagged keyword 'gift card'",
            "relationship_agent": "New recipient",
            "rag_retrieval": ["POLICY-004: Urgency, secrecy, gift cards, crypto are common scam indicators"],
            "model_decision": "HOLD (Reason: 'Payment reason cites gift cards associated with wire fraud')"
        },
        "root_cause_analysis": "TF-IDF keyword matching indexed 'gift card' directly into POLICY-004 ('gift cards are common scam indicators'). The retriever lacked semantic clause awareness that buying a restaurant dinner voucher is distinct from scam demands to purchase anonymous Apple or Steam cards for extortion.",
        "mitigation_strategy": "Enhance RAG with dense bi-encoder embeddings and negative keyword constraint matching: Differentiate commercial voucher purchases from third-party prepaid card laundering demands."
    },
    {
        "id": "FAIL-005",
        "category": "Human Review Divergence",
        "severity": "Operational Friction",
        "title": "Algorithmic Hold Overruled by Senior Investigator",
        "scenario": {
            "customer": "Grace Hopper (Elderly customer, age 78)",
            "recipient": "Jonathan Swift (Caregiver / Handyman)",
            "amount": 1800.00,
            "avg_amount_90d": 110.00,
            "ratio": 16.36,
            "channel": "Phone / Verbal",
            "communication_text": "Payment for roof repair and gutter replacement",
            "ground_truth": "LEGITIMATE (Reputable local contractor)"
        },
        "system_trace": {
            "stage1_score": 0.76,
            "stage1_decision": "STAGE 2",
            "stage2_score": 0.81,
            "model_decision": "HOLD (High risk: elderly demographic + high amount ratio + no prior history)",
            "human_investigator_action": "OVERRULED -> APPROVED",
            "investigator_notes": "Contacted Mrs. Hopper via registered home phone; customer confirmed contractor was on site with signed physical invoice for roofing repair. Contractor license verified in city registry."
        },
        "root_cause_analysis": "The algorithm lacked access to off-chain physical reality (the licensed contractor standing on the roof with an itemized invoice). The system correctly identified elder financial exploitation risk patterns, but the human investigator's outbound phone call resolved the ambiguity.",
        "mitigation_strategy": "Store investigator resolution outcomes in RAG feedback index: Feed validated contractor invoice metadata into the bank's local merchant directory so subsequent home-maintenance payments to Jonathan Swift auto-clear."
    }
]


class FailureAnalysisService:
    @staticmethod
    def list_all_cases() -> List[Dict[str, Any]]:
        return FAILURE_CASES

    @staticmethod
    def get_case(case_id: str) -> Dict[str, Any]:
        for c in FAILURE_CASES:
            if c["id"].lower() == case_id.lower():
                return c
        return FAILURE_CASES[0]

    @staticmethod
    def get_summary_metrics() -> Dict[str, Any]:
        return {
            "total_failure_case_studies": len(FAILURE_CASES),
            "categories": [
                {"name": "False Positives (Type I)", "count": 1, "share_pct": 20.0},
                {"name": "False Negatives (Type II)", "count": 1, "share_pct": 20.0},
                {"name": "Multi-Agent Disagreement", "count": 1, "share_pct": 20.0},
                {"name": "RAG Semantic Collisions", "count": 1, "share_pct": 20.0},
                {"name": "Human Review Divergence", "count": 1, "share_pct": 20.0}
            ],
            "key_takeaway": "Failure analysis demonstrates that autonomous LLM decisions are inherently brittle for financial transactions without calibrated multi-stage routing, evidence decomposition, and a human-in-the-loop safety valve."
        }
