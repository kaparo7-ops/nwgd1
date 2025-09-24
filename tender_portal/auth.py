"""Authentication helpers for the tender portal."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional

from . import database

import hashlib


PASSWORD_ITERATIONS = 120_000
SESSION_DURATION_HOURS = 12


def _pbkdf2_hash(password: str, salt: bytes) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return digest.hex()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = _pbkdf2_hash(password, salt)
    return f"{salt.hex()}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest = stored_hash.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    return secrets.compare_digest(_pbkdf2_hash(password, salt), digest)


def create_user(username: str, password: str, role: str, *, full_name: Optional[str] = None, language: str = "en") -> int:
    password_hash = hash_password(password)
    return database.execute(
        """
        INSERT INTO users(username, full_name, role, password_hash, language)
        VALUES(?, ?, ?, ?, ?)
        """,
        (username, full_name, role, password_hash, language),
    )


def get_user_by_username(username: str) -> Optional[Dict[str, str]]:
    return database.fetch_one("SELECT * FROM users WHERE username = ?", (username,))


def authenticate(username: str, password: str) -> Optional[Dict[str, str]]:
    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def create_session(user_id: int) -> Dict[str, str]:
    token = secrets.token_hex(24)
    expires = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
    database.execute(
        "INSERT INTO sessions(user_id, token, expires_at) VALUES(?, ?, ?)",
        (user_id, token, expires.isoformat()),
    )
    return {"token": token, "expires_at": expires.isoformat()}


def get_user_by_session(token: str) -> Optional[Dict[str, str]]:
    session = database.fetch_one("SELECT * FROM sessions WHERE token = ?", (token,))
    if not session:
        return None
    expires_at = datetime.fromisoformat(session["expires_at"])
    if expires_at < datetime.utcnow():
        database.execute("DELETE FROM sessions WHERE id = ?", (session["id"],))
        return None
    user = database.fetch_one("SELECT * FROM users WHERE id = ?", (session["user_id"],))
    return user


def destroy_session(token: str) -> None:
    database.execute("DELETE FROM sessions WHERE token = ?", (token,))


def ensure_default_users() -> None:
    """Create default role-based users for demo purposes."""
    defaults = [
        ("admin", "Admin123!", "admin", "Administrator"),
        ("procurement", "Procure123!", "procurement", "Procurement Officer"),
        ("project", "Project123!", "project_manager", "Project Manager"),
        ("finance", "Finance123!", "finance", "Finance Officer"),
        ("viewer", "Viewer123!", "viewer", "Read Only Viewer"),
    ]
    for username, password, role, full_name in defaults:
        if not get_user_by_username(username):
            create_user(username, password, role, full_name=full_name, language="en")
