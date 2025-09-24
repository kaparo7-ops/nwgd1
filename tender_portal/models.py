"""Business logic helpers for the tender portal."""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Tuple

from . import database

TENDER_STATUSES = [
    "draft",
    "in_preparation",
    "submitted",
    "awarded",
    "lost",
    "on_hold",
    "cancelled",
]

PROJECT_STATUSES = [
    "planning",
    "executing",
    "completed",
    "closed",
]

PAYMENT_STATUSES = [
    "paid",
    "unpaid",
    "delayed",
]

TENDER_TYPES = ["RFQ", "ITB", "RFP"]


class PermissionError(Exception):
    """Raised when an operation is not permitted for a role."""


ROLE_PERMISSIONS = {
    "admin": {"tenders", "projects", "finance", "suppliers", "reports"},
    "procurement": {"tenders", "reports", "suppliers"},
    "project_manager": {"projects", "reports", "suppliers"},
    "finance": {"projects", "finance", "reports"},
    "viewer": {"reports"},
}


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def check_permission(user: Dict[str, str], area: str) -> None:
    role = user["role"]
    permissions = ROLE_PERMISSIONS.get(role, set())
    if area not in permissions:
        raise PermissionError(f"Role '{role}' does not have access to {area}")


def serialize_user(user: Dict[str, str]) -> Dict[str, str]:
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "language": user.get("language", "en"),
        "full_name": user.get("full_name"),
    }


# Tender helpers

def list_tenders(*, filters: Optional[Dict[str, str]] = None) -> List[Dict[str, str]]:
    base = "SELECT t.*, u.full_name AS assigned_name, s.name_en AS supplier_name_en, s.name_ar AS supplier_name_ar FROM tenders t " \
        "LEFT JOIN users u ON t.assigned_to = u.id " \
        "LEFT JOIN suppliers s ON t.supplier_id = s.id"
    clauses: List[str] = []
    params: List[str] = []
    if filters:
        if filters.get("status"):
            clauses.append("t.status = ?")
            params.append(filters["status"])
        if filters.get("tender_type"):
            clauses.append("t.tender_type = ?")
            params.append(filters["tender_type"])
        if filters.get("assigned_to"):
            clauses.append("t.assigned_to = ?")
            params.append(filters["assigned_to"])
        if filters.get("search"):
            clauses.append("(t.title_en LIKE ? OR t.title_ar LIKE ? OR t.reference_code LIKE ?)")
            term = f"%{filters['search']}%"
            params.extend([term, term, term])
    if clauses:
        base += " WHERE " + " AND ".join(clauses)
    base += " ORDER BY t.submission_deadline IS NULL, t.submission_deadline"
    rows = database.fetch_all(base, params)
    return rows


def create_tender(data: Dict[str, str], *, user: Dict[str, str]) -> int:
    check_permission(user, "tenders")
    tender_id = database.execute(
        """
        INSERT INTO tenders(
            reference_code, title_en, title_ar, tender_type, donor, description_en,
            description_ar, status, estimated_value, currency, submission_deadline,
            issue_date, assigned_to, supplier_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("reference_code"),
            data.get("title_en"),
            data.get("title_ar"),
            data.get("tender_type"),
            data.get("donor"),
            data.get("description_en"),
            data.get("description_ar"),
            data.get("status", "draft"),
            data.get("estimated_value"),
            data.get("currency"),
            data.get("submission_deadline"),
            data.get("issue_date"),
            data.get("assigned_to"),
            data.get("supplier_id"),
            user["id"],
        ),
    )
    return tender_id


def update_tender(tender_id: int, data: Dict[str, str], *, user: Dict[str, str]) -> None:
    check_permission(user, "tenders")
    fields = [
        "reference_code",
        "title_en",
        "title_ar",
        "tender_type",
        "donor",
        "description_en",
        "description_ar",
        "status",
        "estimated_value",
        "currency",
        "submission_deadline",
        "issue_date",
        "assigned_to",
        "supplier_id",
    ]
    assignments = []
    params: List[str] = []
    for field in fields:
        if field in data:
            assignments.append(f"{field} = ?")
            params.append(data[field])
    if not assignments:
        return
    params.append(datetime.now(timezone.utc).isoformat())
    params.append(tender_id)
    sql = f"UPDATE tenders SET {', '.join(assignments)}, updated_at = ? WHERE id = ?"
    database.execute(sql, params)


def get_tender(tender_id: int) -> Optional[Dict[str, str]]:
    return database.fetch_one("SELECT * FROM tenders WHERE id = ?", (tender_id,))


def delete_tender(tender_id: int, *, user: Dict[str, str]) -> None:
    check_permission(user, "tenders")
    database.execute("DELETE FROM tenders WHERE id = ?", (tender_id,))


def save_attachment(tender_id: int, filename: str, content: bytes) -> Dict[str, str]:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    stored_name = f"{tender_id}_{timestamp}_{filename}"
    path = os.path.join(UPLOAD_DIR, stored_name)
    with open(path, "wb") as fh:
        fh.write(content)
    attachment_id = database.execute(
        "INSERT INTO tender_attachments(tender_id, filename, stored_name) VALUES(?, ?, ?)",
        (tender_id, filename, stored_name),
    )
    return {
        "id": attachment_id,
        "filename": filename,
        "stored_name": stored_name,
        "url": f"/files/{stored_name}",
    }


def list_attachments(tender_id: int) -> List[Dict[str, str]]:
    return database.fetch_all("SELECT * FROM tender_attachments WHERE tender_id = ? ORDER BY uploaded_at DESC", (tender_id,))


# Supplier helpers

def list_suppliers() -> List[Dict[str, str]]:
    return database.fetch_all("SELECT * FROM suppliers ORDER BY name_en")


def create_supplier(data: Dict[str, str], *, user: Dict[str, str]) -> int:
    check_permission(user, "suppliers")
    return database.execute(
        """
        INSERT INTO suppliers(name_en, name_ar, contact_name, email, phone, address, notes)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("name_en"),
            data.get("name_ar"),
            data.get("contact_name"),
            data.get("email"),
            data.get("phone"),
            data.get("address"),
            data.get("notes"),
        ),
    )


def update_supplier(supplier_id: int, data: Dict[str, str], *, user: Dict[str, str]) -> None:
    check_permission(user, "suppliers")
    fields = ["name_en", "name_ar", "contact_name", "email", "phone", "address", "notes"]
    assignments = []
    params: List[str] = []
    for field in fields:
        if field in data:
            assignments.append(f"{field} = ?")
            params.append(data[field])
    if not assignments:
        return
    params.append(supplier_id)
    sql = f"UPDATE suppliers SET {', '.join(assignments)} WHERE id = ?"
    database.execute(sql, params)


def delete_supplier(supplier_id: int, *, user: Dict[str, str]) -> None:
    check_permission(user, "suppliers")
    database.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))


# Project helpers

def create_project(data: Dict[str, str], *, user: Dict[str, str]) -> int:
    check_permission(user, "projects")
    project_id = database.execute(
        """
        INSERT INTO projects(
            tender_id, name_en, name_ar, start_date, end_date, status, currency, contract_value,
            cost, exchange_rate, amount_received, amount_invoiced, profit_local, payment_status,
            guarantee_value, guarantee_start, guarantee_end, guarantee_retained, notes, manager_id
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("tender_id"),
            data.get("name_en"),
            data.get("name_ar"),
            data.get("start_date"),
            data.get("end_date"),
            data.get("status", "planning"),
            data.get("currency"),
            data.get("contract_value"),
            data.get("cost"),
            data.get("exchange_rate"),
            data.get("amount_received"),
            data.get("amount_invoiced"),
            data.get("profit_local"),
            data.get("payment_status", "unpaid"),
            data.get("guarantee_value"),
            data.get("guarantee_start"),
            data.get("guarantee_end"),
            data.get("guarantee_retained"),
            data.get("notes"),
            data.get("manager_id"),
        ),
    )
    return project_id


def update_project(project_id: int, data: Dict[str, str], *, user: Dict[str, str]) -> None:
    check_permission(user, "projects")
    fields = [
        "name_en",
        "name_ar",
        "start_date",
        "end_date",
        "status",
        "currency",
        "contract_value",
        "cost",
        "exchange_rate",
        "amount_received",
        "amount_invoiced",
        "profit_local",
        "payment_status",
        "guarantee_value",
        "guarantee_start",
        "guarantee_end",
        "guarantee_retained",
        "notes",
        "manager_id",
    ]
    assignments = []
    params: List[str] = []
    for field in fields:
        if field in data:
            assignments.append(f"{field} = ?")
            params.append(data[field])
    if not assignments:
        return
    params.append(datetime.now(timezone.utc).isoformat())
    params.append(project_id)
    sql = f"UPDATE projects SET {', '.join(assignments)}, updated_at = ? WHERE id = ?"
    database.execute(sql, params)


def list_projects(*, filters: Optional[Dict[str, str]] = None) -> List[Dict[str, str]]:
    base = "SELECT p.*, t.title_en AS tender_title_en, t.title_ar AS tender_title_ar FROM projects p " \
        "JOIN tenders t ON p.tender_id = t.id"
    clauses: List[str] = []
    params: List[str] = []
    if filters:
        if filters.get("status"):
            clauses.append("p.status = ?")
            params.append(filters["status"])
        if filters.get("payment_status"):
            clauses.append("p.payment_status = ?")
            params.append(filters["payment_status"])
        if filters.get("manager_id"):
            clauses.append("p.manager_id = ?")
            params.append(filters["manager_id"])
    if clauses:
        base += " WHERE " + " AND ".join(clauses)
    base += " ORDER BY p.end_date IS NULL, p.end_date"
    return database.fetch_all(base, params)


def get_project(project_id: int) -> Optional[Dict[str, str]]:
    return database.fetch_one("SELECT * FROM projects WHERE id = ?", (project_id,))


def assign_supplier_to_project(project_id: int, supplier_ids: Iterable[int], *, user: Dict[str, str]) -> None:
    check_permission(user, "projects")
    database.execute("DELETE FROM project_suppliers WHERE project_id = ?", (project_id,))
    pairs = [(project_id, supplier_id) for supplier_id in supplier_ids]
    if pairs:
        database.executemany("INSERT INTO project_suppliers(project_id, supplier_id) VALUES(?, ?)", pairs)


def list_project_suppliers(project_id: int) -> List[int]:
    rows = database.fetch_all("SELECT supplier_id FROM project_suppliers WHERE project_id = ?", (project_id,))
    return [row["supplier_id"] for row in rows]


# Invoice helpers

def add_invoice(project_id: int, data: Dict[str, str], *, user: Dict[str, str]) -> int:
    check_permission(user, "finance")
    invoice_id = database.execute(
        """
        INSERT INTO invoices(project_id, amount, currency, due_date, paid_date, status, notes)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_id,
            data.get("amount"),
            data.get("currency"),
            data.get("due_date"),
            data.get("paid_date"),
            data.get("status", "unpaid"),
            data.get("notes"),
        ),
    )
    return invoice_id


def list_invoices(project_id: int) -> List[Dict[str, str]]:
    return database.fetch_all("SELECT * FROM invoices WHERE project_id = ? ORDER BY due_date", (project_id,))


def update_invoice(invoice_id: int, data: Dict[str, str], *, user: Dict[str, str]) -> None:
    check_permission(user, "finance")
    fields = ["amount", "currency", "due_date", "paid_date", "status", "notes"]
    assignments = []
    params: List[str] = []
    for field in fields:
        if field in data:
            assignments.append(f"{field} = ?")
            params.append(data[field])
    if not assignments:
        return
    params.append(invoice_id)
    sql = f"UPDATE invoices SET {', '.join(assignments)} WHERE id = ?"
    database.execute(sql, params)


# Reporting

def tender_summary() -> Dict[str, float]:
    rows = database.fetch_all(
        "SELECT status, COUNT(*) as count, SUM(estimated_value) as total FROM tenders GROUP BY status"
    )
    summary = {row["status"]: row["count"] for row in rows}
    total_value = sum(row["total"] or 0 for row in rows)
    summary["total_estimated"] = total_value
    return summary


def project_summary() -> Dict[str, float]:
    rows = database.fetch_all(
        "SELECT payment_status, COUNT(*) as count, SUM(profit_local) as profit FROM projects GROUP BY payment_status"
    )
    summary = {row["payment_status"]: row["count"] for row in rows}
    summary["total_profit"] = sum(row["profit"] or 0 for row in rows)
    return summary


def financial_pipeline() -> Dict[str, float]:
    outstanding = database.fetch_one(
        "SELECT SUM(amount) as total FROM invoices WHERE status != 'paid'"
    )
    received = database.fetch_one(
        "SELECT SUM(amount_received) as total FROM projects"
    )
    invoiced = database.fetch_one(
        "SELECT SUM(amount_invoiced) as total FROM projects"
    )
    return {
        "outstanding_invoices": outstanding["total"] or 0,
        "amount_received": received["total"] or 0,
        "amount_invoiced": invoiced["total"] or 0,
    }


def calendar_items(within_days: int = 60) -> List[Dict[str, str]]:
    today = date.today()
    end_date = today + timedelta(days=within_days)
    rows = database.fetch_all(
        """
        SELECT id, title_en, title_ar, submission_deadline FROM tenders
        WHERE submission_deadline IS NOT NULL AND submission_deadline BETWEEN ? AND ?
        """,
        (today.isoformat(), end_date.isoformat()),
    )
    items = []
    for row in rows:
        items.append(
            {
                "type": "tender",
                "id": row["id"],
                "title_en": row["title_en"],
                "title_ar": row["title_ar"],
                "date": row["submission_deadline"],
            }
        )
    project_rows = database.fetch_all(
        """
        SELECT id, name_en, name_ar, guarantee_end FROM projects
        WHERE guarantee_end IS NOT NULL AND guarantee_end BETWEEN ? AND ?
        """,
        (today.isoformat(), end_date.isoformat()),
    )
    for row in project_rows:
        items.append(
            {
                "type": "project",
                "id": row["id"],
                "title_en": row["name_en"],
                "title_ar": row["name_ar"],
                "date": row["guarantee_end"],
            }
        )
    return items


# Notifications

def ensure_notification(unique_key: str, *, title: Tuple[str, str], message: Tuple[str, str], level: str, target_role: str) -> None:
    existing = database.fetch_one("SELECT id FROM notifications WHERE unique_key = ?", (unique_key,))
    if existing:
        return
    database.execute(
        """
        INSERT INTO notifications(unique_key, title_en, title_ar, message_en, message_ar, level, target_role)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (unique_key, title[0], title[1], message[0], message[1], level, target_role),
    )


def generate_notifications() -> None:
    today = date.today()
    soon = today + timedelta(days=5)
    # Tenders closing soon
    rows = database.fetch_all(
        """
        SELECT id, title_en, title_ar, submission_deadline FROM tenders
        WHERE submission_deadline IS NOT NULL AND status IN ('draft','in_preparation','submitted')
        """
    )
    for row in rows:
        try:
            deadline = date.fromisoformat(row["submission_deadline"])
        except ValueError:
            continue
        if today <= deadline <= soon:
            days = (deadline - today).days
            ensure_notification(
                unique_key=f"tender_close_{row['id']}",
                title=("Tender closing soon", "إقتراب إقفال مناقصة"),
                message=(
                    f"Tender {row['title_en']} closes in {days} day(s).",
                    f"المناقصة {row['title_ar'] or row['title_en']} تغلق خلال {days} يوم",
                ),
                level="warning",
                target_role="procurement",
            )
    # Invoices past due
    invoice_rows = database.fetch_all(
        """
        SELECT invoices.id, invoices.project_id, invoices.due_date, invoices.status, projects.name_en, projects.name_ar
        FROM invoices JOIN projects ON invoices.project_id = projects.id
        WHERE invoices.status != 'paid' AND invoices.due_date IS NOT NULL
        """
    )
    for row in invoice_rows:
        try:
            due = date.fromisoformat(row["due_date"])
        except ValueError:
            continue
        if due < today:
            ensure_notification(
                unique_key=f"invoice_due_{row['id']}",
                title=("Invoice overdue", "فاتورة متأخرة"),
                message=(
                    f"Invoice for project {row['name_en']} is overdue since {row['due_date']}.",
                    f"فاتورة مشروع {row['name_ar'] or row['name_en']} متأخرة منذ {row['due_date']}.",
                ),
                level="danger",
                target_role="finance",
            )
    # Guarantee nearing expiry
    project_rows = database.fetch_all(
        "SELECT id, name_en, name_ar, guarantee_end FROM projects WHERE guarantee_end IS NOT NULL"
    )
    for row in project_rows:
        try:
            end_date = date.fromisoformat(row["guarantee_end"])
        except ValueError:
            continue
        if today <= end_date <= today + timedelta(days=10):
            days = (end_date - today).days
            ensure_notification(
                unique_key=f"guarantee_due_{row['id']}",
                title=("Guarantee expiring", "استحقاق الضمان"),
                message=(
                    f"Guarantee for project {row['name_en']} expires in {days} day(s).",
                    f"ضمان مشروع {row['name_ar'] or row['name_en']} ينتهي خلال {days} يوم",
                ),
                level="info",
                target_role="project_manager",
            )


def list_notifications(role: str) -> List[Dict[str, str]]:
    return database.fetch_all(
        "SELECT * FROM notifications WHERE target_role = ? ORDER BY created_at DESC",
        (role,),
    )


def mark_notification_read(notification_id: int) -> None:
    database.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))


# CSV export

def export_tenders_to_csv(path: str) -> str:
    rows = list_tenders()
    import csv

    fieldnames = [
        "id",
        "reference_code",
        "title_en",
        "title_ar",
        "tender_type",
        "donor",
        "status",
        "estimated_value",
        "currency",
        "submission_deadline",
        "issue_date",
    ]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key) for key in fieldnames})
    return path
