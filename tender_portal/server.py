"""HTTP server for the tender portal."""
from __future__ import annotations

import base64
import json
import os
import posixpath
import re
import threading
from datetime import datetime
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple
from urllib.parse import parse_qs

from . import auth, database, models

STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend"
EXPORT_DIR = Path(__file__).resolve().parent / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]) -> None:
    data = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _parse_body(handler: BaseHTTPRequestHandler) -> Dict[str, Any]:
    length = int(handler.headers.get("Content-Length", 0))
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


def _parse_cookies(handler: BaseHTTPRequestHandler) -> Dict[str, str]:
    cookie_header = handler.headers.get("Cookie")
    if not cookie_header:
        return {}
    cookie = SimpleCookie()
    cookie.load(cookie_header)
    return {key: morsel.value for key, morsel in cookie.items()}


def _set_cookie(handler: BaseHTTPRequestHandler, key: str, value: str, *, expires: Optional[str] = None) -> None:
    parts = [f"{key}={value}", "Path=/", "HttpOnly"]
    if expires:
        parts.append(f"Expires={expires}")
    handler.send_header("Set-Cookie", "; ".join(parts))


def _clear_cookie(handler: BaseHTTPRequestHandler, key: str) -> None:
    handler.send_header("Set-Cookie", f"{key}=; Path=/; Max-Age=0")


def _load_user(handler: BaseHTTPRequestHandler) -> Optional[Dict[str, Any]]:
    cookies = _parse_cookies(handler)
    token = cookies.get("session")
    if not token:
        return None
    user = auth.get_user_by_session(token)
    return user


RouteHandler = Callable[["TenderPortalRequestHandler", Dict[str, str]], None]


class TenderPortalRequestHandler(BaseHTTPRequestHandler):
    server_version = "TenderPortal/1.0"

    routes: Dict[Tuple[str, str], RouteHandler] = {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/api/"):
            self.handle_api("GET")
        elif self.path.startswith("/files/"):
            self.handle_file_download()
        else:
            self.handle_static()

    def do_POST(self) -> None:  # noqa: N802
        if self.path.startswith("/api/"):
            self.handle_api("POST")
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:  # noqa: N802
        if self.path.startswith("/api/"):
            self.handle_api("PUT")
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_DELETE(self) -> None:  # noqa: N802
        if self.path.startswith("/api/"):
            self.handle_api("DELETE")
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    # Static assets -----------------------------------------------------
    def handle_static(self) -> None:
        path = self.path
        if path == "/":
            path = "/index.html"
        safe_path = posixpath.normpath(path.lstrip("/"))
        file_path = STATIC_DIR / safe_path
        if not file_path.exists() or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = "text/plain"
        if file_path.suffix == ".html":
            content_type = "text/html; charset=utf-8"
        elif file_path.suffix == ".css":
            content_type = "text/css"
        elif file_path.suffix == ".js":
            content_type = "application/javascript"
        elif file_path.suffix in {".png", ".jpg", ".jpeg", ".gif"}:
            content_type = f"image/{file_path.suffix.lstrip('.') }"
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle_file_download(self) -> None:
        stored_name = self.path.split("/", 2)[-1]
        file_path = os.path.join(models.UPLOAD_DIR, stored_name)
        if not os.path.exists(file_path):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        data = Path(file_path).read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Content-Disposition", f"attachment; filename={stored_name}")
        self.end_headers()
        self.wfile.write(data)

    # API ---------------------------------------------------------------
    def handle_api(self, method: str) -> None:
        for (route_method, pattern), handler in self.routes.items():
            if method != route_method:
                continue
            match = re.fullmatch(pattern, self.path.split("?", 1)[0])
            if match:
                try:
                    handler(self, match.groupdict())
                except models.PermissionError as exc:
                    _json_response(self, HTTPStatus.FORBIDDEN, {"error": str(exc)})
                except Exception as exc:  # noqa: BLE001
                    _json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})
                return
        self.send_error(HTTPStatus.NOT_FOUND)

    # Handler helper methods -------------------------------------------
    def get_current_user(self) -> Optional[Dict[str, Any]]:
        return _load_user(self)

    def require_user(self) -> Optional[Dict[str, Any]]:
        user = self.get_current_user()
        if not user:
            _json_response(self, HTTPStatus.UNAUTHORIZED, {"error": "authentication required"})
            return None
        return user

    def read_json_body(self) -> Dict[str, Any]:
        return _parse_body(self)

    def write_json(self, status: int, payload: Dict[str, Any]) -> None:
        _json_response(self, status, payload)


# Route implementations -------------------------------------------------

def route(method: str, pattern: str) -> Callable[[RouteHandler], RouteHandler]:
    def decorator(func: RouteHandler) -> RouteHandler:
        TenderPortalRequestHandler.routes[(method, pattern)] = func
        return func

    return decorator


@route("POST", r"/api/login")
def login(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    body = handler.read_json_body()
    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        handler.write_json(HTTPStatus.BAD_REQUEST, {"error": "username and password are required"})
        return
    user = auth.authenticate(username, password)
    if not user:
        handler.write_json(HTTPStatus.UNAUTHORIZED, {"error": "invalid credentials"})
        return
    session = auth.create_session(user["id"])
    handler.send_response(HTTPStatus.OK)
    _set_cookie(handler, "session", session["token"])
    handler.send_header("Content-Type", "application/json")
    handler.end_headers()
    payload = {"user": models.serialize_user(user)}
    handler.wfile.write(json.dumps(payload).encode("utf-8"))


@route("POST", r"/api/logout")
def logout(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    cookies = _parse_cookies(handler)
    token = cookies.get("session")
    if token:
        auth.destroy_session(token)
    handler.send_response(HTTPStatus.NO_CONTENT)
    _clear_cookie(handler, "session")
    handler.end_headers()


@route("GET", r"/api/me")
def get_me(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.get_current_user()
    if not user:
        handler.write_json(HTTPStatus.UNAUTHORIZED, {"error": "not authenticated"})
        return
    handler.write_json(HTTPStatus.OK, {"user": models.serialize_user(user)})


@route("GET", r"/api/tenders")
def list_tenders(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    filters = {}
    query = handler.path.split("?", 1)
    if len(query) == 2 and query[1]:
        parsed = parse_qs(query[1])
        filters = {key: values[0] for key, values in parsed.items() if values}
    try:
        rows = models.list_tenders(filters=filters)
    except Exception as exc:  # noqa: BLE001
        handler.write_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        return
    handler.write_json(HTTPStatus.OK, {"tenders": rows, "statuses": models.TENDER_STATUSES, "types": models.TENDER_TYPES})


@route("POST", r"/api/tenders")
def create_tender(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    tender_id = models.create_tender(data, user=user)
    handler.write_json(HTTPStatus.CREATED, {"id": tender_id})


@route("GET", r"/api/tenders/(?P<tender_id>\d+)")
def get_tender(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    tender = models.get_tender(int(params["tender_id"]))
    if not tender:
        handler.write_json(HTTPStatus.NOT_FOUND, {"error": "tender not found"})
        return
    attachments = models.list_attachments(tender["id"])
    handler.write_json(HTTPStatus.OK, {"tender": tender, "attachments": attachments})


@route("PUT", r"/api/tenders/(?P<tender_id>\d+)")
def update_tender(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    models.update_tender(int(params["tender_id"]), data, user=user)
    handler.write_json(HTTPStatus.OK, {"status": "updated"})


@route("DELETE", r"/api/tenders/(?P<tender_id>\d+)")
def delete_tender(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    models.delete_tender(int(params["tender_id"]), user=user)
    handler.write_json(HTTPStatus.NO_CONTENT, {})


@route("POST", r"/api/tenders/(?P<tender_id>\d+)/attachments")
def upload_attachment(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    filename = data.get("filename")
    content = data.get("content")
    if not filename or not content:
        handler.write_json(HTTPStatus.BAD_REQUEST, {"error": "filename and content required"})
        return
    try:
        file_bytes = base64.b64decode(content.split(",")[-1])
    except Exception as exc:  # noqa: BLE001
        handler.write_json(HTTPStatus.BAD_REQUEST, {"error": f"invalid file content: {exc}"})
        return
    attachment = models.save_attachment(int(params["tender_id"]), filename, file_bytes)
    handler.write_json(HTTPStatus.CREATED, {"attachment": attachment})


@route("GET", r"/api/projects")
def list_projects(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    query = handler.path.split("?", 1)
    filters = {}
    if len(query) == 2 and query[1]:
        parsed = parse_qs(query[1])
        filters = {key: values[0] for key, values in parsed.items() if values}
    rows = models.list_projects(filters=filters)
    handler.write_json(HTTPStatus.OK, {"projects": rows, "statuses": models.PROJECT_STATUSES})


@route("POST", r"/api/projects")
def create_project(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    project_id = models.create_project(data, user=user)
    handler.write_json(HTTPStatus.CREATED, {"id": project_id})


@route("GET", r"/api/projects/(?P<project_id>\d+)")
def get_project(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    project = models.get_project(int(params["project_id"]))
    if not project:
        handler.write_json(HTTPStatus.NOT_FOUND, {"error": "project not found"})
        return
    suppliers = models.list_project_suppliers(project["id"])
    invoices = models.list_invoices(project["id"])
    handler.write_json(
        HTTPStatus.OK,
        {
            "project": project,
            "suppliers": suppliers,
            "invoices": invoices,
        },
    )


@route("PUT", r"/api/projects/(?P<project_id>\d+)")
def update_project(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    models.update_project(int(params["project_id"]), data, user=user)
    handler.write_json(HTTPStatus.OK, {"status": "updated"})


@route("POST", r"/api/projects/(?P<project_id>\d+)/suppliers")
def assign_suppliers(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    supplier_ids = data.get("supplier_ids", [])
    models.assign_supplier_to_project(int(params["project_id"]), supplier_ids, user=user)
    handler.write_json(HTTPStatus.OK, {"status": "updated"})


@route("POST", r"/api/projects/(?P<project_id>\d+)/invoices")
def create_invoice(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    invoice_id = models.add_invoice(int(params["project_id"]), data, user=user)
    handler.write_json(HTTPStatus.CREATED, {"id": invoice_id})


@route("PUT", r"/api/invoices/(?P<invoice_id>\d+)")
def update_invoice(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    models.update_invoice(int(params["invoice_id"]), data, user=user)
    handler.write_json(HTTPStatus.OK, {"status": "updated"})


@route("GET", r"/api/suppliers")
def get_suppliers(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    rows = models.list_suppliers()
    handler.write_json(HTTPStatus.OK, {"suppliers": rows})


@route("POST", r"/api/suppliers")
def create_supplier(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    supplier_id = models.create_supplier(data, user=user)
    handler.write_json(HTTPStatus.CREATED, {"id": supplier_id})


@route("PUT", r"/api/suppliers/(?P<supplier_id>\d+)")
def update_supplier(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    data = handler.read_json_body()
    models.update_supplier(int(params["supplier_id"]), data, user=user)
    handler.write_json(HTTPStatus.OK, {"status": "updated"})


@route("DELETE", r"/api/suppliers/(?P<supplier_id>\d+)")
def delete_supplier(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    models.delete_supplier(int(params["supplier_id"]), user=user)
    handler.write_json(HTTPStatus.NO_CONTENT, {})


@route("GET", r"/api/reports/summary")
def get_summary(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    models.generate_notifications()
    payload = {
        "tenders": models.tender_summary(),
        "projects": models.project_summary(),
        "finance": models.financial_pipeline(),
        "calendar": models.calendar_items(),
        "recent_tenders": models.latest_tenders(),
        "at_risk_projects": models.projects_at_risk(),
    }
    handler.write_json(HTTPStatus.OK, payload)


@route("GET", r"/api/notifications")
def notifications(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    models.generate_notifications()
    rows = models.list_notifications(user["role"])
    handler.write_json(HTTPStatus.OK, {"notifications": rows})


@route("POST", r"/api/notifications/(?P<notification_id>\d+)/read")
def mark_notification(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    models.mark_notification_read(int(params["notification_id"]))
    handler.write_json(HTTPStatus.OK, {"status": "read"})


@route("GET", r"/api/tenders/export")
def export_tenders(handler: TenderPortalRequestHandler, params: Dict[str, str]) -> None:
    user = handler.require_user()
    if not user:
        return
    filename = f"tenders_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    path = EXPORT_DIR / filename
    models.export_tenders_to_csv(str(path))
    data = path.read_bytes()
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Content-Type", "text/csv")
    handler.send_header("Content-Disposition", f"attachment; filename={filename}")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


# Server bootstrap -----------------------------------------------------

def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    database.init_db()
    auth.ensure_default_users()
    models.ensure_sample_data()
    server = ThreadingHTTPServer((host, port), TenderPortalRequestHandler)
    print(f"Tender portal server running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        database.close_connection()


if __name__ == "__main__":
    run_server()
