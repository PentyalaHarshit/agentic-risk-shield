"""Relationship / context agent. Uses ONLY information the user typed in or explicitly
authorised. Weak signals (surname, missing social profile) never block on their own."""
import re

URGENT = ["urgent", "urgently", "asap", "immediately", "right now", "emergency", "secret",
          "don't tell", "do not tell", "gift card", "crypto", "bitcoin", "usdt", "prize",
          "lottery", "guaranteed", "double your", "arrested", "bail", "verify account",
          "stuck abroad", "wire", "western union", "invest"]
LINK = re.compile(r"https?://|bit\.ly|t\.me/|wa\.me/")


def text_risk(text: str) -> float:
    t = text.lower()
    hits = sum(1 for w in URGENT if w in t) + 2 * len(LINK.findall(t))
    return min(1.0, hits / 4)


class RelationshipAgent:
    name = "relationship_agent"

    def run(self, v, recipient_name_on_tx: str) -> dict:
        evidence, weak = [], []
        rel = v.relationship.lower()
        family = rel in {"family", "relative", "parent", "sibling", "spouse", "child"}

        surname_ok = 1
        if v.user_surname and family and v.user_surname.lower() not in v.name.lower():
            surname_ok = 0
            weak.append("claimed family member has a different surname (weak signal)")
        first = recipient_name_on_tx.split()[0].lower()
        if first not in v.name.lower():
            surname_ok = 0
            weak.append("name on the form does not match the transfer recipient")

        phone_known = 1 if v.phone_in_user_contacts else 0
        if not v.phone_in_user_contacts:
            weak.append("phone number is not in your contacts / could not be linked to you")
        if len(re.sub(r"\D", "", v.phone)) < 8:
            weak.append("phone number looks incomplete")
            phone_known = 0

        location_ok = 1
        if v.user_location and v.user_location.lower() != v.location.lower() and family:
            location_ok = 0
            weak.append("recipient location differs from what you'd expect (weak signal)")
        if v.age < 16:
            weak.append("recipient age is unusual for a payment recipient")

        hist_len = len(v.history.strip())
        rel_verified = int(rel in {"family", "friend"} and hist_len >= 25
                           and len(v.how_do_you_know.strip()) >= 8)
        reason_risk = text_risk(v.reason + " " + v.how_do_you_know)
        if reason_risk > 0:
            evidence.append("payment reason contains scam-associated wording (urgency/secrecy/crypto etc.)")
        if hist_len < 25:
            weak.append("history with recipient is very brief")

        msg_risk = 0.0
        all_msgs = list(v.shared_messages or [])
        if getattr(v, "communication_text", None):
            all_msgs.append(v.communication_text)
        if all_msgs:
            msg_risk = max(text_risk(m) for m in all_msgs)
            if msg_risk > 0:
                evidence.append("messages you provided contain pressure/payment-request language")

        return {"vector": [rel_verified, phone_known, location_ok, surname_ok,
                           reason_risk, hist_len, msg_risk],
                "evidence": evidence, "weak_signals": weak,
                "reason_risk": round(reason_risk, 2), "message_risk": round(msg_risk, 2)}
