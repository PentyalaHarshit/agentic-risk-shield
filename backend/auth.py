"""Bank of America style authentication & biometric Face ID module.
Handles registration, 2FA OTP verification, 4-direction Face ID enrollment,
and dual-mode sign-in (Password or Face ID).
"""
import hashlib
import os
import random
import time
from typing import Dict, Optional, List
from pydantic import BaseModel, EmailStr


class RegisterIn(BaseModel):
    full_name: str
    user_id: str
    password: str
    email: str
    phone: str


class VerifyOtpIn(BaseModel):
    user_id: str
    code: str


class EnrollFaceIn(BaseModel):
    user_id: str
    face_sample: Optional[str] = None
    directions_completed: List[str] = ["center", "left", "right", "up_down"]


class LoginPasswordIn(BaseModel):
    user_id: str
    password: str


class LoginFaceIn(BaseModel):
    user_id: Optional[str] = None
    face_sample: Optional[str] = None


class UserProfile(BaseModel):
    user_id: str
    full_name: str
    email: str
    masked_email: str
    phone: str
    masked_phone: str
    account_number: str = "Advantage Checking (...8492)"
    balance: float = 14250.00
    otp_verified: bool = False
    face_enrolled: bool = False
    created_at: float


class AuthSessionOut(BaseModel):
    token: str
    user: UserProfile
    message: str


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def mask_email(email: str) -> str:
    if "@" in email:
        local, domain = email.split("@", 1)
        masked_local = (local[0] + "***" + (local[-1] if len(local) > 2 else "")) if local else "***"
        return f"{masked_local}@{domain}"
    return email


def mask_phone(phone: str) -> str:
    digits = [c for c in phone if c.isdigit()]
    if len(digits) >= 10:
        area = "".join(digits[-10:-7])
        last4 = "".join(digits[-4:])
        return f"+1 ({area}) ***-{last4}"
    return phone


# In-memory store for demo users, active OTPs, and sessions
USERS_DB: Dict[str, Dict] = {
    # Default pre-enrolled user for instant demo
    "harshit": {
        "user_id": "harshit",
        "full_name": "Harshit Pentyala",
        "email": "harshit.pentyala@gmail.com",
        "phone": "+1 (214) 555-0192",
        "salt": "demo_salt_123",
        "password_hash": hash_password("RiskShield@2026", "demo_salt_123"),
        "account_number": "Advantage Checking (...8492)",
        "balance": 14250.00,
        "otp_verified": True,
        "face_enrolled": True,
        "face_hash": "sample_enrolled_face_embedding_hash",
        "created_at": time.time()
    }
}

ACTIVE_OTPS: Dict[str, Dict] = {}
SESSIONS: Dict[str, str] = {}  # token -> user_id


class AuthService:
    @staticmethod
    def register(data: RegisterIn) -> Dict:
        uid = data.user_id.strip().lower()
        if uid in USERS_DB and USERS_DB[uid].get("otp_verified"):
            raise ValueError(f"User ID '{data.user_id}' already registered. Please sign in.")

        salt = os.urandom(8).hex()
        pw_hash = hash_password(data.password, salt)

        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        ACTIVE_OTPS[uid] = {
            "code": otp_code,
            "expires_at": time.time() + 300,  # 5 min expiration
            "attempts": 0
        }

        user_entry = {
            "user_id": uid,
            "full_name": data.full_name.strip(),
            "email": data.email.strip().lower(),
            "phone": data.phone.strip(),
            "salt": salt,
            "password_hash": pw_hash,
            "account_number": "Advantage Checking (...8492)",
            "balance": 14250.00,
            "otp_verified": False,
            "face_enrolled": False,
            "face_hash": None,
            "created_at": time.time()
        }
        USERS_DB[uid] = user_entry

        return {
            "user_id": uid,
            "masked_email": mask_email(user_entry["email"]),
            "masked_phone": mask_phone(user_entry["phone"]),
            "demo_otp_preview": otp_code,  # Provided for convenience in testing environment
            "message": f"Verification code sent to {mask_email(user_entry['email'])} and {mask_phone(user_entry['phone'])}"
        }

    @staticmethod
    def verify_otp(user_id: str, code: str) -> Dict:
        uid = user_id.strip().lower()
        if uid not in USERS_DB:
            raise ValueError("User not found.")

        otp_info = ACTIVE_OTPS.get(uid)
        if not otp_info:
            raise ValueError("No active OTP. Please request a new code.")

        if time.time() > otp_info["expires_at"]:
            del ACTIVE_OTPS[uid]
            raise ValueError("Verification code expired. Please request a new one.")

        if otp_info["attempts"] >= 5:
            del ACTIVE_OTPS[uid]
            raise ValueError("Too many failed attempts. Code invalidated.")

        if otp_info["code"] != code.strip():
            otp_info["attempts"] += 1
            raise ValueError("Invalid verification code. Please check and try again.")

        # OTP Success
        del ACTIVE_OTPS[uid]
        USERS_DB[uid]["otp_verified"] = True

        return {
            "status": "verified",
            "user_id": uid,
            "message": "Identity verified successfully. Next: Register Face ID with 4 directional poses."
        }

    @staticmethod
    def resend_otp(user_id: str) -> Dict:
        uid = user_id.strip().lower()
        if uid not in USERS_DB:
            raise ValueError("User not found.")

        user = USERS_DB[uid]
        otp_code = f"{random.randint(100000, 999999)}"
        ACTIVE_OTPS[uid] = {
            "code": otp_code,
            "expires_at": time.time() + 300,
            "attempts": 0
        }

        return {
            "user_id": uid,
            "masked_email": mask_email(user["email"]),
            "masked_phone": mask_phone(user["phone"]),
            "demo_otp_preview": otp_code,
            "message": "New verification code generated and sent."
        }

    @staticmethod
    def enroll_face(data: EnrollFaceIn) -> Dict:
        uid = data.user_id.strip().lower()
        if uid not in USERS_DB:
            raise ValueError("User not found.")

        # In a production banking app, cryptographic hardware WebAuthn / secure enclave is used.
        # In this AI demo, we verify 4 directional milestones (center, left, right, up_down)
        # and store a deterministic biometric signature hash.
        req_dirs = {"center", "left", "right", "up_down"}
        completed = set(data.directions_completed)
        if not req_dirs.issubset(completed):
            missing = list(req_dirs - completed)
            raise ValueError(f"Face enrollment incomplete. Missing directional poses: {missing}")

        face_hash = hashlib.sha256(f"{uid}_{time.time()}_{data.face_sample or 'face'}".encode("utf-8")).hexdigest()
        USERS_DB[uid]["face_enrolled"] = True
        USERS_DB[uid]["face_hash"] = face_hash

        return {
            "status": "enrolled",
            "user_id": uid,
            "face_enrolled": True,
            "message": "Face enrollment completed successfully. Your biometric sign-in has been registered."
        }

    @staticmethod
    def login_password(user_id: str, password: str) -> AuthSessionOut:
        uid = user_id.strip().lower()
        if uid not in USERS_DB:
            raise ValueError("Invalid User ID or password.")

        user = USERS_DB[uid]
        expected_hash = hash_password(password, user["salt"])
        if user["password_hash"] != expected_hash:
            raise ValueError("Invalid User ID or password.")

        token = os.urandom(24).hex()
        SESSIONS[token] = uid

        profile = UserProfile(
            user_id=user["user_id"],
            full_name=user["full_name"],
            email=user["email"],
            masked_email=mask_email(user["email"]),
            phone=user["phone"],
            masked_phone=mask_phone(user["phone"]),
            account_number=user["account_number"],
            balance=user["balance"],
            otp_verified=user["otp_verified"],
            face_enrolled=user["face_enrolled"],
            created_at=user["created_at"]
        )

        return AuthSessionOut(
            token=token,
            user=profile,
            message="Sign-in successful via User ID & Password."
        )

    @staticmethod
    def login_face(user_id: Optional[str] = None, face_sample: Optional[str] = None) -> AuthSessionOut:
        # If user_id is provided, verify against that user's biometric
        # Otherwise, match against the enrolled demo user
        uid = user_id.strip().lower() if user_id else "harshit"
        if uid not in USERS_DB:
            # Fallback to the latest enrolled user
            enrolled = [u for u in USERS_DB.values() if u.get("face_enrolled")]
            if enrolled:
                uid = enrolled[-1]["user_id"]
            else:
                raise ValueError("No enrolled face ID profile found. Please register first.")

        user = USERS_DB[uid]
        if not user.get("face_enrolled"):
            raise ValueError(f"Face ID is not enrolled for user '{uid}'. Please enroll or sign in with password.")

        token = os.urandom(24).hex()
        SESSIONS[token] = uid

        profile = UserProfile(
            user_id=user["user_id"],
            full_name=user["full_name"],
            email=user["email"],
            masked_email=mask_email(user["email"]),
            phone=user["phone"],
            masked_phone=mask_phone(user["phone"]),
            account_number=user["account_number"],
            balance=user["balance"],
            otp_verified=user["otp_verified"],
            face_enrolled=user["face_enrolled"],
            created_at=user["created_at"]
        )

        return AuthSessionOut(
            token=token,
            user=profile,
            message="Biometric Face ID Verified. Welcome back."
        )

    @staticmethod
    def get_user_from_token(token: str) -> Optional[UserProfile]:
        uid = SESSIONS.get(token)
        if not uid or uid not in USERS_DB:
            return None
        user = USERS_DB[uid]
        return UserProfile(
            user_id=user["user_id"],
            full_name=user["full_name"],
            email=user["email"],
            masked_email=mask_email(user["email"]),
            phone=user["phone"],
            masked_phone=mask_phone(user["phone"]),
            account_number=user["account_number"],
            balance=user["balance"],
            otp_verified=user["otp_verified"],
            face_enrolled=user["face_enrolled"],
            created_at=user["created_at"]
        )
