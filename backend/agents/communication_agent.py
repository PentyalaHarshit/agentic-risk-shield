"""Communication Analysis Agent.
Analyzes user-provided communication excerpts / social messaging context
(WhatsApp, iMessage, Telegram, Signal, Other).
Adheres to POLICY-008: only analyzes explicitly provided data (no covert access).
"""
import re
import os
from typing import Dict, Any, List, Optional


class CommunicationAgent:
    name = "communication_agent"

    URGENCY_PATTERNS = [
        r"\burgent(ly)?\b", r"\basap\b", r"\bimmediat(e|ely)\b", r"\bright now\b",
        r"\bquick(ly)?\b", r"\bhurry\b", r"\bemergency\b", r"\bwithin \d+ (hour|min|minute)s?\b",
        r"\btoday only\b", r"\bdeadline\b", r"\bbefore it('s| is) too late\b",
        r"\brun out of time\b", r"\btime is running out\b", r"\bcritical\b"
    ]

    PAYMENT_PATTERNS = [
        r"\b(send|wire|transfer|pay|deposit|lend|borrow|forward)\b.*\b(money|cash|\$|usd|eur|gbp|funds|amount|dollars?)\b",
        r"\b(gift card|itunes|steam card|apple card|google play|crypto|bitcoin|btc|eth|usdt|solana)\b",
        r"\b(bank transfer|zelle|venmo|cashapp|paypal|western union|moneygram)\b",
        r"\b(account (is )?(locked|frozen|blocked|suspended|restricted))\b",
        r"\b(pay (the )?(fee|fine|penalty|tax|bail|customs|release fee))\b",
        r"\bneed \$?\d+[\d,]*\b", r"\breimburse you\b", r"\bpay you back (tomorrow|soon|double)\b"
    ]

    IMPERSONATION_PATTERNS = [
        r"\b(lost|broke|dropped|damaged) my phone\b",
        r"\bthis is my new (number|phone|account)\b",
        r"\btemp(orary)? number\b",
        r"\b(hi|hey) (mum|mom|dad|son|daughter|grandma|grandpa)\b",
        r"\bit('s| is) me, (your|ur)\b",
        r"\b(bank|support|security|fraud) (team|agent|department|desk)\b",
        r"\b(police|officer|detective|irs|fbi|customs|tax authority)\b",
        r"\bcan't talk (right now|on the phone)\b",
        r"\bcall you later\b",
        r"\bmic(rophone)? is broken\b"
    ]

    SECRECY_PATTERNS = [
        r"\bdon('t|ot) tell (anyone|mum|dad|my parents|the bank|your spouse|anybody)\b",
        r"\bkeep this (secret|between us|private|quiet)\b",
        r"\btrust me\b",
        r"\bdon('t|ot) ask questions\b"
    ]

    DISCOURAGE_CALL_PATTERNS = [
        r"\bdo not call (me)?\b",
        r"\bdon('t|ot) call (me)?\b",
        r"\bcan('t|not) talk\b",
        r"\bmic(rophone)? is broken\b",
        r"\bno audio\b"
    ]

    SUSPICIOUS_LINK_PATTERNS = [
        r"https?://\S+",
        r"\b(bit\.ly|tinyurl\.com|t\.me/|wa\.me/|rb\.gy|is\.gd|cutt\.ly|goo\.gl)\S*",
        r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",  # Raw IP address
        r"\b(verify|login|secure|update|banking)-[a-z0-9\-]+\.(com|xyz|top|ru|cc|to)\b"
    ]

    INCONSISTENCY_TRIGGERS = [
        ("investment", r"\b(guaranteed|return|forex|crypto|trading|profit|doubl(e|ing)|yield)\b"),
        ("prize", r"\b(won|winner|lottery|sweepstake|claim your prize)\b"),
        ("authority", r"\b(warrant|arrest|court|fine|agent|penalty)\b")
    ]

    def analyze(self, channel: str, text: Optional[str], relationship: Optional[str] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        """Analyzes communication text and channel. Returns structured evidence."""
        channel_name = (channel or "WhatsApp").strip()
        cleaned_text = (text or "").strip()

        empty_signals = {
            "urgency": 0.0,
            "payment_request": False,
            "impersonation": False,
            "secrecy": False,
            "verification_discouragement": False,
            "suspicious_url": False
        }

        if not cleaned_text:
            return {
                "channel": channel_name,
                "signals": empty_signals,
                "evidence_strength": 0.0,
                "urgency_score": 0.0,
                "payment_request_detected": False,
                "impersonation_indicator": False,
                "suspicious_link_detected": False,
                "pressure_indicator": False,
                "communication_risk": 0.0,
                "evidence": [],
                "has_data": False,
            }

        t_lower = cleaned_text.lower()
        evidence: List[str] = []

        # 1. Urgency evaluation
        urgency_hits = sum(1 for p in self.URGENCY_PATTERNS if re.search(p, t_lower))
        urgency_score = min(1.0, round(urgency_hits * 0.33, 2))
        if urgency_score >= 0.5:
            evidence.append(f"Strong urgency detected ({urgency_score:.0%}): urgent payment or immediate deadline requested.")
        elif urgency_score > 0:
            evidence.append("Moderate urgency language present in communication.")

        # 2. Payment request detection
        payment_hits = sum(1 for p in self.PAYMENT_PATTERNS if re.search(p, t_lower))
        payment_request_detected = payment_hits > 0
        if payment_request_detected:
            if re.search(r"gift card|crypto|bitcoin|usdt", t_lower):
                evidence.append("Irreversible payment methods requested (gift card / cryptocurrency).")
            elif re.search(r"locked|frozen|fee|penalty|bail", t_lower):
                evidence.append("Payment demanded under pretext of account unlock, fee, or penalty.")
            else:
                evidence.append("Direct payment/transfer solicitation detected in conversation.")

        # 3. Impersonation detection
        impersonation_hits = sum(1 for p in self.IMPERSONATION_PATTERNS if re.search(p, t_lower))
        impersonation_indicator = impersonation_hits > 0
        if impersonation_indicator:
            if re.search(r"new (number|phone)|lost my phone", t_lower):
                evidence.append("Classic 'lost phone / new number' impersonation narrative detected.")
            elif re.search(r"bank|support|security|police|officer", t_lower):
                evidence.append("Claimed authority/institution role (bank security, police, or support).")
            else:
                evidence.append("Impersonation pattern detected in sender self-identification.")

        # 4. Secrecy & Pressure
        secrecy_hits = sum(1 for p in self.SECRECY_PATTERNS if re.search(p, t_lower))
        secrecy_indicator = secrecy_hits > 0
        if secrecy_indicator:
            evidence.append("Secrecy instruction detected ('don't tell anyone' / keep secret).")

        # 5. Verification Discouragement (discourages voice/video verification)
        discourage_hits = sum(1 for p in self.DISCOURAGE_CALL_PATTERNS if re.search(p, t_lower))
        discouragement_indicator = discourage_hits > 0
        if discouragement_indicator:
            evidence.append("Sender discourages voice or video verification calls.")

        # 6. Suspicious links
        suspicious_link_detected = any(re.search(p, cleaned_text, re.IGNORECASE) for p in self.SUSPICIOUS_LINK_PATTERNS)
        if suspicious_link_detected:
            evidence.append("Shortened, masked, or suspicious URL link present in message.")

        # 7. Contextual Inconsistencies with stated reason
        if reason:
            r_lower = reason.lower()
            for tag, pat in self.INCONSISTENCY_TRIGGERS:
                if re.search(pat, t_lower) and not re.search(pat, r_lower):
                    evidence.append(f"Communication references {tag} topics which are not mentioned in your stated payment reason.")
                    break

        # Calculate calibrated evidence strength (0.0 to 1.0)
        # Represents the intensity of scam signals in the communication excerpt
        raw_strength = (
            (urgency_score * 0.30)
            + (0.25 if payment_request_detected else 0.0)
            + (0.25 if impersonation_indicator else 0.0)
            + (0.15 if secrecy_indicator else 0.0)
            + (0.15 if discouragement_indicator else 0.0)
            + (0.15 if suspicious_link_detected else 0.0)
        )
        evidence_strength = round(min(1.0, max(0.0, raw_strength)), 2)

        signals = {
            "urgency": urgency_score,
            "payment_request": payment_request_detected,
            "impersonation": impersonation_indicator,
            "secrecy": secrecy_indicator,
            "verification_discouragement": discouragement_indicator,
            "suspicious_url": suspicious_link_detected
        }

        # Optional LLM polish if Anthropic key is available
        llm_enhanced_evidence = self._maybe_llm_enhance(channel_name, cleaned_text, evidence_strength, evidence)
        if llm_enhanced_evidence:
            evidence = llm_enhanced_evidence

        return {
            "channel": channel_name,
            "signals": signals,
            "evidence_strength": evidence_strength,
            "evidence": evidence,
            # Backward compatibility
            "urgency_score": urgency_score,
            "payment_request_detected": payment_request_detected,
            "impersonation_indicator": impersonation_indicator,
            "suspicious_link_detected": suspicious_link_detected,
            "pressure_indicator": secrecy_indicator or discouragement_indicator,
            "communication_risk": evidence_strength,
            "has_data": True,
        }

    def _maybe_llm_enhance(self, channel: str, text: str, risk: float, default_evidence: List[str]) -> Optional[List[str]]:
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key or not text:
            return None
        try:
            import anthropic
            c = anthropic.Anthropic(api_key=key)
            prompt = (
                f"Analyze this {channel} message excerpt provided by a bank customer.\n"
                f"Text: \"{text}\"\n"
                f"Rule-based signal strength: {risk}\n"
                "Return 2-4 concise bullet points explaining specific scam signals or reassuring factors. "
                "Do not make definitive accusations (e.g. say 'contains urgency cues' not 'this is a scammer'). "
                "Format each point as a separate line starting with '- '."
            )
            r = c.messages.create(
                model=os.getenv("LLM_MODEL", "claude-sonnet-4-5"),
                max_tokens=250,
                messages=[{"role": "user", "content": prompt}]
            )
            lines = [l.strip("- ").strip() for l in r.content[0].text.splitlines() if l.strip().startswith("-")]
            return lines if lines else None
        except Exception:
            return None
