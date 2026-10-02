"""
THE SOUL VASTRA - Authentication & Authorization Engine
Server-side security, PBKDF2 hashing, session tokens, rate limiting, and role enforcement.
"""

import hashlib
import hmac
import os
import secrets
import json
from datetime import datetime, timedelta, timezone
from backend.database import get_db_connection

# Session TTL (24 hours)
SESSION_DURATION_HOURS = 24
# Rate limit: Max 5 failed attempts per 15 minutes
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

def hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 200,000 iterations.
    Returns (hex_hash, hex_salt).
    """
    if salt is None:
        salt = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000)
    return hashed.hex(), salt.hex()

def verify_password(password: str, stored_hash_hex: str, salt_hex: str) -> bool:
    """Verifies a plaintext password against the stored PBKDF2 hash using constant-time comparison."""
    salt = bytes.fromhex(salt_hex)
    computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000).hex()
    return hmac.compare_digest(computed_hash, stored_hash_hex)

def check_rate_limit(ip_address: str, email: str) -> bool:
    """
    Checks if an IP or email has exceeded max failed login attempts in the lockout window.
    Returns True if allowed, False if rate limited.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) as failed_count
        FROM login_attempts
        WHERE (ip_address = ? OR email = ?)
          AND attempt_time > ?
          AND success = 0
    """, (ip_address, email, cutoff))
    row = cursor.fetchone()
    conn.close()
    return row["failed_count"] < MAX_FAILED_ATTEMPTS

def record_login_attempt(email: str, ip_address: str, success: bool):
    """Records an authentication attempt for audit and rate-limiting."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO login_attempts (email, ip_address, attempt_time, success)
            VALUES (?, ?, ?, ?)
        """, (email, ip_address, now, 1 if success else 0))
    conn.close()

def create_session(user_id: str, ip_address: str = None, user_agent: str = None) -> str:
    """Generates a cryptographically random session token and stores it in the database."""
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=SESSION_DURATION_HOURS)

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO sessions (token, user_id, created_at, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (token, user_id, now.isoformat(), expires.isoformat(), ip_address, user_agent))
        # Update user's last login
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now.isoformat(), user_id))
    conn.close()
    return token

def get_current_user_from_token(token: str) -> dict | None:
    """
    Validates a session token. Returns the user dict if valid and unexpired; otherwise None.
    Automatically invalidates expired sessions.
    """
    if not token:
        return None

    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_login, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ?
    """, (token, now))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None

def destroy_session(token: str):
    """Removes a session token from the database."""
    if not token:
        return
    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.close()

def require_owner(user: dict | None) -> bool:
    """Strict authorization check: returns True only if user is authenticated AND has role 'owner'."""
    return user is not None and user.get("role") == "owner"

def record_audit_log(user_id: str, user_email: str, action: str, object_type: str,
                     object_id: str = None, old_value = None, new_value = None, ip_address: str = None):
    """Logs an administrative action to the immutable audit table."""
    now = datetime.now(timezone.utc).isoformat()
    old_str = json.dumps(old_value, default=str) if old_value is not None else None
    new_str = json.dumps(new_value, default=str) if new_value is not None else None

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO audit_logs (timestamp, user_id, user_email, action, object_type, object_id, old_value_json, new_value_json, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (now, user_id, user_email, action, object_type, object_id, old_str, new_str, ip_address))
    conn.close()
