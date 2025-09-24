"""Database utilities for the tender portal."""
from __future__ import annotations

import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

_DB_LOCAL = threading.local()
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "portal.db")


def get_database_path() -> str:
    """Return the database path, allowing overrides for tests."""
    return os.environ.get("TENDER_PORTAL_DB", DEFAULT_DB_PATH)


def _ensure_connection() -> sqlite3.Connection:
    conn: Optional[sqlite3.Connection] = getattr(_DB_LOCAL, "conn", None)
    if conn is None:
        db_path = get_database_path()
        if db_path != ":memory:":
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        setattr(_DB_LOCAL, "conn", conn)
    return conn


def close_connection() -> None:
    conn: Optional[sqlite3.Connection] = getattr(_DB_LOCAL, "conn", None)
    if conn is not None:
        conn.close()
        setattr(_DB_LOCAL, "conn", None)


@contextmanager
def get_cursor(commit: bool = False):
    conn = _ensure_connection()
    cur = conn.cursor()
    try:
        yield cur
        if commit:
            conn.commit()
    finally:
        cur.close()


def init_db() -> None:
    """Create database tables if they do not already exist."""
    schema = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        full_name TEXT,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_en TEXT NOT NULL,
        name_ar TEXT,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_code TEXT,
        title_en TEXT NOT NULL,
        title_ar TEXT,
        tender_type TEXT NOT NULL,
        donor TEXT,
        description_en TEXT,
        description_ar TEXT,
        status TEXT NOT NULL,
        estimated_value REAL,
        currency TEXT,
        submission_deadline TEXT,
        issue_date TEXT,
        assigned_to INTEGER,
        supplier_id INTEGER,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tender_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER NOT NULL,
        name_en TEXT NOT NULL,
        name_ar TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT NOT NULL,
        currency TEXT,
        contract_value REAL,
        cost REAL,
        exchange_rate REAL,
        amount_received REAL,
        amount_invoiced REAL,
        profit_local REAL,
        payment_status TEXT,
        guarantee_value REAL,
        guarantee_start TEXT,
        guarantee_end TEXT,
        guarantee_retained REAL,
        notes TEXT,
        manager_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
        FOREIGN KEY(manager_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS project_suppliers (
        project_id INTEGER NOT NULL,
        supplier_id INTEGER NOT NULL,
        PRIMARY KEY (project_id, supplier_id),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT,
        due_date TEXT,
        paid_date TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_role TEXT,
        title_en TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        message_en TEXT NOT NULL,
        message_ar TEXT NOT NULL,
        level TEXT NOT NULL,
        unique_key TEXT NOT NULL UNIQUE,
        related_type TEXT,
        related_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER NOT NULL DEFAULT 0
    );
    """
    with get_cursor(commit=True) as cur:
        cur.executescript(schema)


def reset_database() -> None:
    """Drop known tables – intended for tests only."""
    tables = [
        "notifications",
        "invoices",
        "project_suppliers",
        "projects",
        "tender_attachments",
        "tenders",
        "suppliers",
        "sessions",
        "users"
    ]
    with get_cursor(commit=True) as cur:
        for table in tables:
            cur.execute(f"DROP TABLE IF EXISTS {table}")


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def fetch_all(query: str, params: Iterable[Any] = ()) -> List[Dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
    return [row_to_dict(row) for row in rows]


def fetch_one(query: str, params: Iterable[Any] = ()) -> Optional[Dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(query, tuple(params))
        row = cur.fetchone()
    return row_to_dict(row) if row else None


def execute(query: str, params: Iterable[Any] = ()) -> int:
    with get_cursor(commit=True) as cur:
        cur.execute(query, tuple(params))
        return cur.lastrowid


def executemany(query: str, seq_of_params: Iterable[Iterable[Any]]) -> None:
    with get_cursor(commit=True) as cur:
        cur.executemany(query, list(seq_of_params))


def touch_timestamp(table: str, pk: int) -> None:
    with get_cursor(commit=True) as cur:
        cur.execute(
            f"UPDATE {table} SET updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), pk),
        )
