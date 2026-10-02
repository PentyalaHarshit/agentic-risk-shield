class RiskAgent:
    """Maps score -> decision (POLICY-001) and enforces guard-rails:
    weak signals / an LLM opinion alone can never BLOCK."""
    name = "risk_agent"
    LOW, HIGH = 0.15, 0.85

    def stage1(self, score: float) -> str:
        if score < self.LOW: return "APPROVE"
        if score >= self.HIGH: return "HOLD"
        return "REQUIRE_VERIFICATION"

    def stage2(self, score: float, hard_evidence: bool) -> str:
        if score < 0.40: return "APPROVE"
        if score >= 0.75 and hard_evidence: return "BLOCK"
        return "HOLD"
