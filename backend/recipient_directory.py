"""Simulated Recipient Directory (Zelle / Bank of America / Wells Fargo style lookup).
Maps enrolled phone numbers, emails, or names to verified profiles without exposing
sensitive private data.
"""
import re
from typing import Optional, List, Dict
from schemas.transaction import RecipientProfile


PRESET_DIRECTORY: Dict[str, Dict] = {
    "2145551641": {
        "recipient_id": "REC-9102",
        "full_name": "John Michael Smith",
        "phone": "+1 214 555 1641",
        "masked_phone": "+1 (214) ***-1641",
        "email": "r.smith@gmail.com",
        "masked_email": "r***@gmail.com",
        "location": "Dallas, Texas",
        "account_age_days": 20,
        "phone_verified": True,
        "account_verified": True,
        "is_new_recipient": True,
        "prior_transfers": 0,
        "fraud_reports": 0
    },
    "2145550192": {
        "recipient_id": "REC-9102",
        "full_name": "John Michael Smith",
        "phone": "+1 214 555 0192",
        "masked_phone": "+1 (214) ***-1641",
        "email": "r.smith@gmail.com",
        "masked_email": "r***@gmail.com",
        "location": "Dallas, Texas",
        "account_age_days": 20,
        "phone_verified": True,
        "account_verified": True,
        "is_new_recipient": True,
        "prior_transfers": 0,
        "fraud_reports": 0
    },
    "4155552481": {
        "recipient_id": "REC-4412",
        "full_name": "Sarah Elizabeth Miller",
        "phone": "+1 415 555 2481",
        "masked_phone": "+1 (415) ***-2481",
        "email": "sarah.m@gmail.com",
        "masked_email": "s***@gmail.com",
        "location": "San Francisco, California",
        "account_age_days": 950,
        "phone_verified": True,
        "account_verified": True,
        "is_new_recipient": False,
        "prior_transfers": 14,
        "fraud_reports": 0
    },
    "3125558839": {
        "recipient_id": "REC-7731",
        "full_name": "David Alexander Vance",
        "phone": "+1 312 555 8839",
        "masked_phone": "+1 (312) ***-8839",
        "email": "david.vance@yahoo.com",
        "masked_email": "d***@yahoo.com",
        "location": "Chicago, Illinois",
        "account_age_days": 5,
        "phone_verified": False,
        "account_verified": False,
        "is_new_recipient": True,
        "prior_transfers": 0,
        "fraud_reports": 2
    }
}


def clean_phone(p: str) -> str:
    return re.sub(r"\D", "", p)[-10:]


def mask_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) >= 10:
        area = digits[-10:-7]
        last4 = digits[-4:]
        return f"+1 ({area}) ***-{last4}"
    return raw


def mask_email(email: str) -> str:
    if "@" in email:
        local, domain = email.split("@", 1)
        masked_local = local[0] + "***" if local else "***"
        return f"{masked_local}@{domain}"
    return email


def lookup_recipient(query: str) -> RecipientProfile:
    """Finds or dynamically generates a simulated directory profile for any input."""
    q_str = (query or "").strip().lower()
    cleaned = clean_phone(q_str)

    # 1. Exact preset match by phone
    if cleaned in PRESET_DIRECTORY:
        return RecipientProfile(**PRESET_DIRECTORY[cleaned])

    # 2. Match by email or name
    for key, data in PRESET_DIRECTORY.items():
        if q_str in data["email"].lower() or q_str in data["full_name"].lower():
            return RecipientProfile(**data)

    # 3. Dynamic lookup for any arbitrary phone number or email
    if "@" in q_str:
        name_guess = q_str.split("@")[0].replace(".", " ").replace("_", " ").title()
        return RecipientProfile(
            recipient_id=f"REC-{abs(hash(q_str)) % 8999 + 1000}",
            full_name=name_guess or "Enrolled Recipient",
            phone="+1 555 019 9900",
            masked_phone="+1 (555) ***-9900",
            email=q_str,
            masked_email=mask_email(q_str),
            location="United States",
            account_age_days=15,
            phone_verified=True,
            account_verified=True,
            is_new_recipient=True,
            prior_transfers=0,
            fraud_reports=0
        )

    # Assume phone number or name
    digits = re.sub(r"\D", "", q_str)
    if len(digits) >= 7:
        masked = mask_phone(q_str)
        return RecipientProfile(
            recipient_id=f"REC-{abs(hash(q_str)) % 8999 + 1000}",
            full_name="John Michael Smith" if "214" in digits else "Verified Recipient",
            phone=q_str,
            masked_phone=masked,
            email="recipient@gmail.com",
            masked_email="r***@gmail.com",
            location="Dallas, Texas" if "214" in digits else "United States",
            account_age_days=20 if "214" in digits else 120,
            phone_verified=True,
            account_verified=True,
            is_new_recipient=True,
            prior_transfers=0,
            fraud_reports=0
        )

    # Fallback default
    return RecipientProfile(
        recipient_id="REC-9102",
        full_name=query.title() if query else "John Michael Smith",
        phone="+1 214 555 0192",
        masked_phone="+1 (214) ***-0192",
        email="john.smith@gmail.com",
        masked_email="j***@gmail.com",
        location="Dallas, Texas",
        account_age_days=20,
        phone_verified=True,
        account_verified=True,
        is_new_recipient=True,
        prior_transfers=0,
        fraud_reports=0
    )


def list_sample_recipients() -> List[RecipientProfile]:
    return [RecipientProfile(**data) for data in PRESET_DIRECTORY.values()]
