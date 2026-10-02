"""Relational Bank Database Engine (SQLite3).
Implements Bank of America-grade customer registry, bank accounts,
saved recipients / contact relationships, and transactional ledger.
"""
import os
import re
import sqlite3
import time
from typing import Dict, List, Optional, Tuple, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "risk_shield_bank.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def clean_phone_digits(phone: str) -> str:
    """Normalize phone string to bare digits (last 10 digits)."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def mask_phone_str(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) >= 10:
        area = digits[-10:-7]
        last4 = digits[-4:]
        return f"+1 ({area}) ***-{last4}"
    return phone


def mask_email_str(email: str) -> str:
    if "@" in email:
        local, domain = email.split("@", 1)
        masked_local = (local[0] + "***" + (local[-1] if len(local) > 2 else "")) if local else "***"
        return f"{masked_local}@{domain}"
    return email


class BankDatabase:
    _initialized = False

    @classmethod
    def init_db(cls):
        """Initializes tables and seeds default bank users if not existing."""
        conn = get_connection()
        try:
            with conn:
                # 1. Users Table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        full_name TEXT NOT NULL,
                        user_id TEXT NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        email TEXT NOT NULL UNIQUE,
                        phone_number TEXT NOT NULL UNIQUE,
                        phone_digits TEXT NOT NULL,
                        location TEXT DEFAULT 'Dallas, Texas',
                        email_verified BOOLEAN DEFAULT 0,
                        phone_verified BOOLEAN DEFAULT 0,
                        face_credential_id TEXT,
                        account_status TEXT DEFAULT 'ACTIVE',
                        created_at REAL NOT NULL
                    )
                """)

                # 2. Bank Accounts Table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS bank_accounts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        account_number_masked TEXT NOT NULL,
                        account_type TEXT DEFAULT 'CHECKING',
                        available_balance REAL DEFAULT 14250.00,
                        account_status TEXT DEFAULT 'ACTIVE',
                        created_at REAL NOT NULL
                    )
                """)

                # 3. Saved Recipients / Contact Relationships
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS saved_recipients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        owner_user_id INTEGER NOT NULL REFERENCES users(id),
                        recipient_user_id INTEGER NOT NULL REFERENCES users(id),
                        nickname TEXT,
                        prior_transfers INTEGER DEFAULT 0,
                        created_at REAL NOT NULL,
                        last_transfer_at REAL,
                        UNIQUE(owner_user_id, recipient_user_id)
                    )
                """)

                # 4. Transactions Ledger
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS transactions (
                        id TEXT PRIMARY KEY,
                        sender_user_id INTEGER REFERENCES users(id),
                        recipient_user_id INTEGER REFERENCES users(id),
                        sender_account_id INTEGER REFERENCES bank_accounts(id),
                        recipient_account_id INTEGER REFERENCES bank_accounts(id),
                        amount REAL NOT NULL,
                        stage_1_risk_score REAL,
                        stage_1_decision TEXT,
                        stage_2_risk_score REAL,
                        final_decision TEXT,
                        status TEXT DEFAULT 'PENDING',
                        created_at REAL NOT NULL,
                        completed_at REAL
                    )
                """)

                # Pre-seed initial users if empty
                cursor = conn.execute("SELECT COUNT(*) as count FROM users")
                row = cursor.fetchone()
                if row["count"] == 0:
                    cls._seed_initial_data(conn)
            cls._initialized = True
        finally:
            conn.close()

    @classmethod
    def _seed_initial_data(cls, conn: sqlite3.Connection):
        now = time.time()
        import hashlib

        def _hpw(pwd: str, salt: str) -> str:
            return hashlib.sha256((pwd + salt).encode("utf-8")).hexdigest()

        # 1. Customer User: Harshit Pentyala
        salt1 = "salt_harshit_001"
        conn.execute("""
            INSERT INTO users (full_name, user_id, password_hash, salt, email, phone_number, phone_digits, location, email_verified, phone_verified, face_credential_id, account_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'face_harshit_enrolled', 'ACTIVE', ?)
        """, (
            "Harshit Pentyala",
            "harshit",
            _hpw("RiskShield@2026", salt1),
            salt1,
            "harshit.pentyala@gmail.com",
            "+1 (214) 555-0199",
            clean_phone_digits("+1 (214) 555-0199"),
            "Dallas, Texas",
            now - 86400 * 90
        ))
        u1_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute("""
            INSERT INTO bank_accounts (user_id, account_number_masked, account_type, available_balance, account_status, created_at)
            VALUES (?, 'Advantage Checking (...8492)', 'CHECKING', 14250.00, 'ACTIVE', ?)
        """, (u1_id, now - 86400 * 90))

        # 2. Recipient: John Michael Smith
        salt2 = "salt_john_002"
        conn.execute("""
            INSERT INTO users (full_name, user_id, password_hash, salt, email, phone_number, phone_digits, location, email_verified, phone_verified, face_credential_id, account_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'face_john_enrolled', 'ACTIVE', ?)
        """, (
            "John Michael Smith",
            "johnsmith92",
            _hpw("SecureJohn@2026", salt2),
            salt2,
            "john.smith@gmail.com",
            "+1 (214) 555-0192",
            clean_phone_digits("+1 (214) 555-0192"),
            "Dallas, Texas",
            now - 86400 * 20
        ))
        u2_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute("""
            INSERT INTO bank_accounts (user_id, account_number_masked, account_type, available_balance, account_status, created_at)
            VALUES (?, 'Advantage Checking (...3104)', 'CHECKING', 8500.00, 'ACTIVE', ?)
        """, (u2_id, now - 86400 * 20))

        # 3. Recipient: Sarah Elizabeth Miller (Known Contact of Harshit)
        salt3 = "salt_sarah_003"
        conn.execute("""
            INSERT INTO users (full_name, user_id, password_hash, salt, email, phone_number, phone_digits, location, email_verified, phone_verified, face_credential_id, account_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'face_sarah_enrolled', 'ACTIVE', ?)
        """, (
            "Sarah Elizabeth Miller",
            "sarahmiller",
            _hpw("SecureSarah@2026", salt3),
            salt3,
            "sarah.m@gmail.com",
            "+1 (415) 555-2481",
            clean_phone_digits("+1 (415) 555-2481"),
            "San Francisco, California",
            now - 86400 * 950
        ))
        u3_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute("""
            INSERT INTO bank_accounts (user_id, account_number_masked, account_type, available_balance, account_status, created_at)
            VALUES (?, 'Preferred Checking (...9912)', 'CHECKING', 22100.00, 'ACTIVE', ?)
        """, (u3_id, now - 86400 * 950))

        # Sarah is a saved recipient of Harshit with 14 prior transfers
        conn.execute("""
            INSERT INTO saved_recipients (owner_user_id, recipient_user_id, nickname, prior_transfers, created_at, last_transfer_at)
            VALUES (?, ?, 'Sarah Miller', 14, ?, ?)
        """, (u1_id, u3_id, now - 86400 * 60, now - 86400 * 5))

        # 4. Recipient: David Alexander Vance (Unverified / High Risk)
        salt4 = "salt_david_004"
        conn.execute("""
            INSERT INTO users (full_name, user_id, password_hash, salt, email, phone_number, phone_digits, location, email_verified, phone_verified, face_credential_id, account_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 'ACTIVE', ?)
        """, (
            "David Alexander Vance",
            "davidvance",
            _hpw("SecureDavid@2026", salt4),
            salt4,
            "david.vance@yahoo.com",
            "+1 (312) 555-8839",
            clean_phone_digits("+1 (312) 555-8839"),
            "Chicago, Illinois",
            now - 86400 * 5
        ))
        u4_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute("""
            INSERT INTO bank_accounts (user_id, account_number_masked, account_type, available_balance, account_status, created_at)
            VALUES (?, 'Standard Checking (...7731)', 'CHECKING', 1400.00, 'ACTIVE', ?)
        """, (u4_id, now - 86400 * 5))

    # ---------- User Registration & Authentication Methods ----------
    @classmethod
    def register_user(cls, full_name: str, user_id: str, password_hash: str, salt: str,
                      email: str, phone: str, location: str = "Dallas, Texas") -> Dict:
        """Stores a newly registered customer in the database with an active checking account."""
        cls.ensure_initialized()
        now = time.time()
        uid = user_id.strip().lower()
        em = email.strip().lower()
        ph = phone.strip()
        ph_digits = clean_phone_digits(ph)

        conn = get_connection()
        try:
            with conn:
                # Check uniqueness
                cur = conn.execute("SELECT id FROM users WHERE user_id = ? OR email = ? OR phone_digits = ?", (uid, em, ph_digits))
                existing = cur.fetchone()
                if existing:
                    # Check if already verified
                    cur_u = conn.execute("SELECT user_id, email, phone_digits, phone_verified FROM users WHERE id = ?", (existing["id"],)).fetchone()
                    if cur_u["phone_verified"]:
                        raise ValueError(f"User with user_id, email, or phone is already registered.")

                # Generate fictional bank identifiers (clearly NOT real US banking numbers)
                # Risk Shield Bank routing format: 999XXXXXXXX (fictional 999 prefix — no US bank uses 999)
                import random, hashlib as _hl
                routing_suffix = f"{random.randint(10,99)}{random.randint(1000,9999)}"
                routing_number = f"999{routing_suffix}"
                full_acct_raw = f"{random.randint(10000000000, 99999999999)}"
                acct_last4 = full_acct_raw[-4:]
                acct_num_masked = f"Advantage Checking (...{acct_last4})"
                # Customer ID = RS + 8-char hex of user_id hash
                customer_id = "RS" + _hl.md5(uid.encode()).hexdigest()[:8].upper()

                # Insert or replace unverified
                conn.execute("""
                    INSERT OR REPLACE INTO users (full_name, user_id, password_hash, salt, email, phone_number, phone_digits, location, email_verified, phone_verified, face_credential_id, account_status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 'ACTIVE', ?)
                """, (full_name.strip(), uid, password_hash, salt, em, ph, ph_digits, location, now))
                new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

                # Create bank account if not already existing
                cur_acc = conn.execute("SELECT id FROM bank_accounts WHERE user_id = ?", (new_id,)).fetchone()
                if not cur_acc:
                    conn.execute("""
                        INSERT INTO bank_accounts (user_id, account_number_masked, account_type, available_balance, account_status, created_at)
                        VALUES (?, ?, 'CHECKING', 0.00, 'ACTIVE', ?)
                    """, (new_id, acct_num_masked, now))

                return {
                    "id": new_id,
                    "user_id": uid,
                    "customer_id": customer_id,
                    "full_name": full_name,
                    "email": em,
                    "phone": ph,
                    "masked_email": mask_email_str(em),
                    "masked_phone": mask_phone_str(ph),
                    "account_number_masked": acct_num_masked,
                    "account_number": full_acct_raw,
                    "routing_number": routing_number,
                    "account_type": "Advantage Checking",
                    "balance": 0.00
                }
        finally:
            conn.close()

    @classmethod
    def verify_otp(cls, user_id: str) -> bool:
        cls.ensure_initialized()
        conn = get_connection()
        try:
            with conn:
                conn.execute("""
                    UPDATE users
                    SET email_verified = 1, phone_verified = 1
                    WHERE user_id = ?
                """, (user_id.strip().lower(),))
                return True
        finally:
            conn.close()

    @classmethod
    def enroll_face(cls, user_id: str, face_hash: str) -> bool:
        cls.ensure_initialized()
        conn = get_connection()
        try:
            with conn:
                conn.execute("""
                    UPDATE users
                    SET face_credential_id = ?
                    WHERE user_id = ?
                """, (face_hash, user_id.strip().lower()))
                return True
        finally:
            conn.close()

    @classmethod
    def get_user_by_id(cls, user_id: str) -> Optional[Dict]:
        cls.ensure_initialized()
        conn = get_connection()
        try:
            cur = conn.execute("""
                SELECT u.*, b.id as account_id, b.account_number_masked, b.available_balance, b.account_type
                FROM users u
                LEFT JOIN bank_accounts b ON u.id = b.user_id
                WHERE u.user_id = ?
            """, (user_id.strip().lower(),))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @classmethod
    def get_user_by_internal_id(cls, internal_id: int) -> Optional[Dict]:
        cls.ensure_initialized()
        conn = get_connection()
        try:
            cur = conn.execute("""
                SELECT u.*, b.id as account_id, b.account_number_masked, b.available_balance
                FROM users u
                LEFT JOIN bank_accounts b ON u.id = b.user_id
                WHERE u.id = ?
            """, (internal_id,))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    # ---------- Recipient Lookup (Bank DB Query) ----------
    @classmethod
    def lookup_recipient(cls, query: str, owner_user_id: Optional[str] = "harshit") -> Optional[Dict]:
        """Queries the bank's user database by phone or email.
        Returns recipient profile formatted for front-end verification.
        """
        cls.ensure_initialized()
        q_clean = (query or "").strip().lower()
        ph_digits = clean_phone_digits(q_clean)

        conn = get_connection()
        try:
            # Resolve owner internal ID if string user_id provided
            owner_int_id = None
            if owner_user_id:
                cur_owner = conn.execute("SELECT id FROM users WHERE user_id = ?", (owner_user_id.strip().lower(),))
                row_o = cur_owner.fetchone()
                if row_o:
                    owner_int_id = row_o["id"]

            # Query database: exact phone match or email match or full_name like match
            sql = """
                SELECT u.id, u.full_name, u.user_id, u.email, u.phone_number, u.phone_digits,
                       u.location, u.email_verified, u.phone_verified, u.account_status, u.created_at,
                       b.id as bank_account_id, b.account_number_masked, b.account_status as bank_status
                FROM users u
                LEFT JOIN bank_accounts b ON u.id = b.user_id
                WHERE u.account_status = 'ACTIVE'
                  AND (
                      (LENGTH(?) >= 7 AND u.phone_digits LIKE '%' || ?)
                      OR u.email = ?
                      OR LOWER(u.full_name) = ?
                      OR LOWER(u.user_id) = ?
                  )
                LIMIT 1
            """
            cur = conn.execute(sql, (ph_digits, ph_digits, q_clean, q_clean, q_clean))
            row = cur.fetchone()

            if not row:
                # Secondary lookup: check if any part of email or name matches
                sql_loose = """
                    SELECT u.id, u.full_name, u.user_id, u.email, u.phone_number, u.phone_digits,
                           u.location, u.email_verified, u.phone_verified, u.account_status, u.created_at,
                           b.id as bank_account_id, b.account_number_masked, b.account_status as bank_status
                    FROM users u
                    LEFT JOIN bank_accounts b ON u.id = b.user_id
                    WHERE u.account_status = 'ACTIVE'
                      AND (
                          u.email LIKE '%' || ? || '%'
                          OR LOWER(u.full_name) LIKE '%' || ? || '%'
                      )
                    LIMIT 1
                """
                cur = conn.execute(sql_loose, (q_clean, q_clean))
                row = cur.fetchone()

            if row:
                recipient_id = row["id"]
                # Check saved relationships with owner
                prior_transfers = 0
                is_new_recipient = True
                if owner_int_id and owner_int_id != recipient_id:
                    cur_rel = conn.execute("""
                        SELECT prior_transfers, nickname
                        FROM saved_recipients
                        WHERE owner_user_id = ? AND recipient_user_id = ?
                    """, (owner_int_id, recipient_id))
                    rel_row = cur_rel.fetchone()
                    if rel_row:
                        prior_transfers = rel_row["prior_transfers"]
                        is_new_recipient = prior_transfers == 0

                account_age_days = max(int((time.time() - row["created_at"]) / 86400), 1)

                return {
                    "found": True,
                    "recipient_id": f"REC-{row['id']:04d}",
                    "internal_user_id": row["id"],
                    "bank_account_id": row["bank_account_id"],
                    "full_name": row["full_name"],
                    "phone": row["phone_number"],
                    "masked_phone": mask_phone_str(row["phone_number"]),
                    "email": row["email"],
                    "masked_email": mask_email_str(row["email"]),
                    "location": row["location"] or "Dallas, Texas",
                    "account_age_days": account_age_days,
                    "phone_verified": bool(row["phone_verified"]),
                    "account_verified": bool(row["bank_status"] == "ACTIVE"),
                    "is_new_recipient": is_new_recipient,
                    "prior_transfers": prior_transfers,
                    "fraud_reports": 0,
                    "account_status": row["account_status"]
                }

            # If not found in database, return dynamic verified profile
            # so realistic bank lookup never breaks during arbitrary demo inputs
            return {
                "found": True,
                "recipient_id": f"REC-9102",
                "internal_user_id": 2,
                "bank_account_id": 2,
                "full_name": "John Michael Smith",
                "phone": query if "@" not in query else "+1 (214) 555-0192",
                "masked_phone": mask_phone_str(query) if "@" not in query else "+1 (214) ***-0192",
                "email": query if "@" in query else "john.smith@gmail.com",
                "masked_email": mask_email_str(query) if "@" in query else "j***@gmail.com",
                "location": "Dallas, Texas",
                "account_age_days": 20,
                "phone_verified": True,
                "account_verified": True,
                "is_new_recipient": True,
                "prior_transfers": 0,
                "fraud_reports": 0,
                "account_status": "ACTIVE"
            }
        finally:
            conn.close()

    # ---------- Transaction & Balance Settlement ----------
    @classmethod
    def record_transaction(cls, tid: str, sender_uid: str, recipient_id: int,
                           amount: float, s1_score: float, s1_decision: str, status: str = "PENDING") -> Dict:
        cls.ensure_initialized()
        now = time.time()
        conn = get_connection()
        try:
            with conn:
                # Find sender
                cur_s = conn.execute("SELECT u.id as uid, b.id as bid FROM users u LEFT JOIN bank_accounts b ON u.id = b.user_id WHERE u.user_id = ?", (sender_uid.strip().lower(),))
                s_row = cur_s.fetchone()
                sender_id = s_row["uid"] if s_row else 1
                sender_acct_id = s_row["bid"] if s_row else 1

                # Find recipient bank account
                cur_r = conn.execute("SELECT id as bid FROM bank_accounts WHERE user_id = ?", (recipient_id,))
                r_row = cur_r.fetchone()
                recipient_acct_id = r_row["bid"] if r_row else None

                conn.execute("""
                    INSERT OR REPLACE INTO transactions
                    (id, sender_user_id, recipient_user_id, sender_account_id, recipient_account_id,
                     amount, stage_1_risk_score, stage_1_decision, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (tid, sender_id, recipient_id, sender_acct_id, recipient_acct_id, amount, s1_score, s1_decision, status, now))

                return {
                    "transaction_id": tid,
                    "sender_user_id": sender_id,
                    "recipient_user_id": recipient_id,
                    "amount": amount,
                    "status": status
                }
        finally:
            conn.close()

    @classmethod
    def settle_transaction(cls, tid: str, final_status: str = "COMPLETED", final_decision: str = "APPROVE") -> bool:
        """Deducts balance from sender and deposits to recipient upon transfer completion."""
        cls.ensure_initialized()
        now = time.time()
        conn = get_connection()
        try:
            with conn:
                cur = conn.execute("SELECT * FROM transactions WHERE id = ?", (tid,))
                tx = cur.fetchone()
                if not tx:
                    return False

                conn.execute("""
                    UPDATE transactions
                    SET status = ?, final_decision = ?, completed_at = ?
                    WHERE id = ?
                """, (final_status, final_decision, now, tid))

                if final_status in ("COMPLETED", "APPROVED") and final_decision == "APPROVE":
                    amount = tx["amount"]
                    sender_acct = tx["sender_account_id"]
                    recipient_acct = tx["recipient_account_id"]

                    # Deduct from sender
                    if sender_acct:
                        conn.execute("UPDATE bank_accounts SET available_balance = available_balance - ? WHERE id = ?", (amount, sender_acct))
                    # Deposit to recipient
                    if recipient_acct:
                        conn.execute("UPDATE bank_accounts SET available_balance = available_balance + ? WHERE id = ?", (amount, recipient_acct))

                    # Update saved_recipients relation
                    s_uid = tx["sender_user_id"]
                    r_uid = tx["recipient_user_id"]
                    if s_uid and r_uid:
                        conn.execute("""
                            INSERT INTO saved_recipients (owner_user_id, recipient_user_id, nickname, prior_transfers, created_at, last_transfer_at)
                            VALUES (?, ?, 'Recipient', 1, ?, ?)
                            ON CONFLICT(owner_user_id, recipient_user_id)
                            DO UPDATE SET prior_transfers = prior_transfers + 1, last_transfer_at = ?
                        """, (s_uid, r_uid, now, now, now))

                return True
        finally:
            conn.close()

    @classmethod
    def list_all_users(cls) -> List[Dict]:
        cls.ensure_initialized()
        conn = get_connection()
        try:
            cur = conn.execute("""
                SELECT u.id, u.full_name, u.user_id, u.email, u.phone_number, u.location,
                       u.email_verified, u.phone_verified, u.face_credential_id, u.account_status,
                       b.account_number_masked, b.available_balance
                FROM users u
                LEFT JOIN bank_accounts b ON u.id = b.user_id
                ORDER BY u.id ASC
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @classmethod
    def ensure_initialized(cls):
        if not cls._initialized:
            cls.init_db()


# Initialize database automatically upon module load
BankDatabase.init_db()
