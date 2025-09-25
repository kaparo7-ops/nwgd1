"""Business logic helpers for the tender portal."""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

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


def serialize_user(user: Dict[str, str]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "language": user.get("language", "en"),
        "full_name": user.get("full_name"),
        "permissions": sorted(ROLE_PERMISSIONS.get(user["role"], set())),
    }


# Demo data bootstrap -------------------------------------------------

def ensure_sample_data() -> None:
    """Populate the database with illustrative demo records when empty."""

    existing = database.fetch_one("SELECT COUNT(*) AS count FROM tenders")
    if existing and existing["count"]:
        return

    users = database.fetch_all("SELECT id, username FROM users")
    user_lookup = {row["username"]: row["id"] for row in users}
    admin_id = user_lookup.get("admin")
    if admin_id is None:
        return

    today = date.today()
    project_manager_id = user_lookup.get("project")

    supplier_specs = [
        {
            "key": "civil",
            "name_en": "Atlas Construction Group",
            "name_ar": "مجموعة أطلس للبناء",
            "contact_name": "Noura El-Fitouri",
            "email": "noura@atlas.ly",
            "phone": "+218-21-555-1200",
            "address": "Tripoli, Dahra",
            "notes": "Registered civil works supplier",
        },
        {
            "key": "logistics",
            "name_en": "Oasis Logistics",
            "name_ar": "واحة للخدمات اللوجستية",
            "contact_name": "Khaled Al-Hariri",
            "email": "khaled@oasislogistics.ly",
            "phone": "+218-92-777-4343",
            "address": "Benghazi, Port Road",
            "notes": "Fleet and customs clearance",
        },
        {
            "key": "it",
            "name_en": "Green Future Supplies",
            "name_ar": "مستلزمات المستقبل الأخضر",
            "contact_name": "Salma Al-Senussi",
            "email": "salma@greenfuture.ly",
            "phone": "+218-91-888-9988",
            "address": "Misrata, Industrial Zone",
            "notes": "ICT and solar solutions",
        },
    ]

    supplier_ids: Dict[str, int] = {}
    for spec in supplier_specs:
        supplier_ids[spec["key"]] = database.execute(
            """
            INSERT INTO suppliers(name_en, name_ar, contact_name, email, phone, address, notes)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,
            (
                spec["name_en"],
                spec.get("name_ar"),
                spec.get("contact_name"),
                spec.get("email"),
                spec.get("phone"),
                spec.get("address"),
                spec.get("notes"),
            ),
        )

    tender_specs = [
        {
            "key": "health",
            "reference_code": "RFP-2023-009",
            "title_en": "Primary health clinic rehabilitation",
            "title_ar": "تأهيل العيادات الصحية الأولية",
            "tender_type": "RFP",
            "donor": "UNICEF",
            "description_en": "Design, supply and rehabilitation of clinics across Fezzan.",
            "description_ar": "تصميم وتوريد وتأهيل للعيادات في فزان.",
            "status": "awarded",
            "estimated_value": 320000,
            "currency": "USD",
            "submission_deadline": (today - timedelta(days=45)).isoformat(),
            "issue_date": (today - timedelta(days=75)).isoformat(),
            "assigned_username": "procurement",
            "supplier": "civil",
        },
        {
            "key": "schools",
            "reference_code": "ITB-2024-014",
            "title_en": "School rehabilitation Lot 2",
            "title_ar": "تأهيل المدارس - الحزمة الثانية",
            "tender_type": "ITB",
            "donor": "UNDP",
            "description_en": "Construction works for 6 schools in Tripoli and Misrata.",
            "description_ar": "أعمال صيانة لست مدارس في طرابلس ومصراتة.",
            "status": "submitted",
            "estimated_value": 210000,
            "currency": "USD",
            "submission_deadline": (today + timedelta(days=12)).isoformat(),
            "issue_date": (today - timedelta(days=15)).isoformat(),
            "assigned_username": "procurement",
            "supplier": "civil",
        },
        {
            "key": "solar",
            "reference_code": "RFQ-2024-021",
            "title_en": "Solar hybrid systems for field offices",
            "title_ar": "أنظمة شمسية هجينة للمكاتب الميدانية",
            "tender_type": "RFQ",
            "donor": "IOM",
            "description_en": "Supply and install hybrid power for Sabha and Kufra offices.",
            "description_ar": "توريد وتركيب طاقة هجينة لمكاتب سبها والكفرة.",
            "status": "in_preparation",
            "estimated_value": 98000,
            "currency": "USD",
            "submission_deadline": (today + timedelta(days=28)).isoformat(),
            "issue_date": (today - timedelta(days=3)).isoformat(),
            "assigned_username": "procurement",
            "supplier": "it",
        },
        {
            "key": "logistics",
            "reference_code": "RFP-2023-015",
            "title_en": "Humanitarian logistics framework",
            "title_ar": "إطار الخدمات اللوجستية الإنسانية",
            "tender_type": "RFP",
            "donor": "UNHCR",
            "description_en": "Two-year logistics support services including warehousing and transport.",
            "description_ar": "خدمات لوجستية لمدة عامين تشمل التخزين والنقل.",
            "status": "on_hold",
            "estimated_value": 450000,
            "currency": "USD",
            "submission_deadline": (today + timedelta(days=5)).isoformat(),
            "issue_date": (today - timedelta(days=20)).isoformat(),
            "assigned_username": "procurement",
            "supplier": "logistics",
        },
    ]

    tender_ids: Dict[str, int] = {}
    for spec in tender_specs:
        assigned_id = user_lookup.get(spec.get("assigned_username")) if spec.get("assigned_username") else None
        supplier_id = supplier_ids.get(spec.get("supplier", ""))
        tender_ids[spec["key"]] = database.execute(
            """
            INSERT INTO tenders(
                reference_code, title_en, title_ar, tender_type, donor, description_en,
                description_ar, status, estimated_value, currency, submission_deadline,
                issue_date, assigned_to, supplier_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                spec.get("reference_code"),
                spec.get("title_en"),
                spec.get("title_ar"),
                spec.get("tender_type"),
                spec.get("donor"),
                spec.get("description_en"),
                spec.get("description_ar"),
                spec.get("status", "draft"),
                spec.get("estimated_value"),
                spec.get("currency"),
                spec.get("submission_deadline"),
                spec.get("issue_date"),
                assigned_id,
                supplier_id,
                admin_id,
            ),
        )

    project_specs = [
        {
            "key": "clinic",
            "tender": "health",
            "name_en": "Fezzan clinic network",
            "name_ar": "شبكة العيادات في فزان",
            "start_date": (today - timedelta(days=90)).isoformat(),
            "end_date": (today - timedelta(days=10)).isoformat(),
            "status": "executing",
            "currency": "LYD",
            "contract_value": 1050000,
            "cost": 830000,
            "exchange_rate": 4.8,
            "amount_received": 520000,
            "amount_invoiced": 780000,
            "profit_local": 220000,
            "payment_status": "delayed",
            "guarantee_value": 60000,
            "guarantee_start": (today - timedelta(days=120)).isoformat(),
            "guarantee_end": (today + timedelta(days=6)).isoformat(),
            "guarantee_retained": 30000,
            "notes": "Final civil works punch list outstanding in Sabha.",
            "manager_username": "project",
            "suppliers": ["civil", "it"],
        },
        {
            "key": "schools",
            "tender": "schools",
            "name_en": "Tripoli & Misrata schools lot",
            "name_ar": "حزمة مدارس طرابلس ومصراتة",
            "start_date": (today - timedelta(days=35)).isoformat(),
            "end_date": (today + timedelta(days=95)).isoformat(),
            "status": "planning",
            "currency": "USD",
            "contract_value": 210000,
            "cost": 156000,
            "exchange_rate": 4.9,
            "amount_received": 0,
            "amount_invoiced": 52000,
            "profit_local": 75000,
            "payment_status": "unpaid",
            "guarantee_value": 12000,
            "guarantee_start": (today - timedelta(days=15)).isoformat(),
            "guarantee_end": (today + timedelta(days=130)).isoformat(),
            "guarantee_retained": 6000,
            "notes": "Bid submitted, awaiting evaluation results.",
            "manager_username": "project",
            "suppliers": ["civil"],
        },
    ]

    project_ids: Dict[str, int] = {}
    for spec in project_specs:
        tender_id = tender_ids.get(spec.get("tender"))
        if not tender_id:
            continue
        manager_id = user_lookup.get(spec.get("manager_username")) if spec.get("manager_username") else project_manager_id
        project_id = database.execute(
            """
            INSERT INTO projects(
                tender_id, name_en, name_ar, start_date, end_date, status, currency, contract_value,
                cost, exchange_rate, amount_received, amount_invoiced, profit_local, payment_status,
                guarantee_value, guarantee_start, guarantee_end, guarantee_retained, notes, manager_id
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tender_id,
                spec.get("name_en"),
                spec.get("name_ar"),
                spec.get("start_date"),
                spec.get("end_date"),
                spec.get("status", "planning"),
                spec.get("currency"),
                spec.get("contract_value"),
                spec.get("cost"),
                spec.get("exchange_rate"),
                spec.get("amount_received"),
                spec.get("amount_invoiced"),
                spec.get("profit_local"),
                spec.get("payment_status", "unpaid"),
                spec.get("guarantee_value"),
                spec.get("guarantee_start"),
                spec.get("guarantee_end"),
                spec.get("guarantee_retained"),
                spec.get("notes"),
                manager_id,
            ),
        )
        project_ids[spec["key"]] = project_id
        supplier_keys = spec.get("suppliers", [])
        pairs = [
            (project_id, supplier_ids[key])
            for key in supplier_keys
            if key in supplier_ids
        ]
        if pairs:
            database.executemany(
                "INSERT INTO project_suppliers(project_id, supplier_id) VALUES(?, ?)",
                pairs,
            )

    invoice_specs = [
        {
            "project": "clinic",
            "amount": 25000,
            "currency": "USD",
            "due_date": (today - timedelta(days=5)).isoformat(),
            "paid_date": None,
            "status": "unpaid",
            "notes": "Second interim certificate awaiting approval.",
        },
        {
            "project": "clinic",
            "amount": 18000,
            "currency": "USD",
            "due_date": (today + timedelta(days=18)).isoformat(),
            "paid_date": None,
            "status": "unpaid",
            "notes": "Retention release planned post inspection.",
        },
        {
            "project": "schools",
            "amount": 52000,
            "currency": "USD",
            "due_date": (today + timedelta(days=35)).isoformat(),
            "paid_date": None,
            "status": "unpaid",
            "notes": "Mobilisation invoice issued to UNDP.",
        },
    ]

    for spec in invoice_specs:
        project_id = project_ids.get(spec.get("project"))
        if not project_id:
            continue
        database.execute(
            """
            INSERT INTO invoices(project_id, amount, currency, due_date, paid_date, status, notes)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                spec.get("amount"),
                spec.get("currency"),
                spec.get("due_date"),
                spec.get("paid_date"),
                spec.get("status", "unpaid"),
                spec.get("notes"),
            ),
        )

    generate_notifications()


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
    items.sort(key=lambda item: item.get("date") or "")
    return items


def latest_tenders(limit: int = 5) -> List[Dict[str, Any]]:
    return database.fetch_all(
        """
        SELECT t.id, t.reference_code, t.title_en, t.title_ar, t.tender_type, t.status,
               t.submission_deadline, t.estimated_value, t.currency, t.created_at,
               u.full_name AS assigned_name, u.username AS assigned_username
        FROM tenders t
        LEFT JOIN users u ON t.assigned_to = u.id
        ORDER BY t.created_at DESC
        LIMIT ?
        """,
        (limit,),
    )


def projects_at_risk(limit: int = 5) -> List[Dict[str, Any]]:
    today = date.today()
    rows = database.fetch_all(
        """
        SELECT p.*, t.title_en AS tender_title_en, t.title_ar AS tender_title_ar
        FROM projects p
        JOIN tenders t ON p.tender_id = t.id
        ORDER BY
            CASE p.payment_status WHEN 'delayed' THEN 0 WHEN 'unpaid' THEN 1 ELSE 2 END,
            p.end_date IS NULL,
            p.end_date
        LIMIT ?
        """,
        (limit,),
    )
    results: List[Dict[str, Any]] = []
    for row in rows:
        flags: List[str] = []
        if row.get("payment_status") == "delayed":
            flags.append("payment_delayed")
        elif row.get("payment_status") == "unpaid":
            flags.append("payment_unpaid")
        end_date = row.get("end_date")
        if end_date:
            try:
                if date.fromisoformat(end_date) < today:
                    flags.append("milestone_overdue")
            except ValueError:
                pass
        guarantee_end = row.get("guarantee_end")
        if guarantee_end:
            try:
                if date.fromisoformat(guarantee_end) <= today + timedelta(days=10):
                    flags.append("guarantee_due")
            except ValueError:
                pass
        enriched = dict(row)
        enriched["flags"] = flags
        results.append(enriched)
    return results


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
