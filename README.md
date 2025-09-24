# Tender & Project Management Portal

This repository contains a lightweight web application for managing tenders, bids, and project execution for international development programmes. The solution is designed for bilingual (Arabic/English) usage and covers procurement, project delivery, supplier management, invoicing, and proactive notifications.

## Features

- **Tender management** – create and track RFQ/ITB/RFP records, assign owners, manage attachments, and export pipeline data to CSV.
- **Project lifecycle** – link awarded tenders to projects, capture key financial indicators, manage guarantees, and track payment status.
- **Finance module** – log project invoices and monitor outstanding amounts.
- **Supplier directory** – maintain supplier contact details and link suppliers to projects.
- **Role-based access** – demo accounts for admin, procurement, finance, project manager, and read-only viewer roles.
- **Dashboards & reports** – consolidated metrics, upcoming calendar milestones, and financial pipeline snapshots.
- **Notifications** – automatic alerts for closing tenders, overdue invoices, and expiring guarantees.
- **Bilingual UI** – toggle Arabic/English labels instantly from the client.

## Preparing a fresh Ubuntu 22.04 host

The following walkthrough assumes a clean Ubuntu 22.04 installation with sudo access. Adjust the target paths as needed for you
r organisation’s standards.

1. **Update the base system**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install the required tooling** – Git is used to fetch the source and Python 3 powers the backend API.

   ```bash
   sudo apt install -y python3 python3-venv python3-pip git
   ```

3. **Create a home for the application**. The example below places the portal under `/opt/tender-portal`, but any writable locat
ion works.

   ```bash
   sudo mkdir -p /opt/tender-portal
   sudo chown "$USER":"$USER" /opt/tender-portal
   cd /opt/tender-portal
   ```

4. **Fetch the project files**. Clone the repository or copy an exported archive into the target directory.

   ```bash
   git clone <YOUR_REPOSITORY_URL> .
   ```

   If you receive the code as a ZIP/TAR file, extract it so that the `frontend/`, `tender_portal/`, and `tests/` directories sit
   directly under `/opt/tender-portal/`.

5. **Create an isolated Python environment** to keep system packages clean.

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   ```

6. **Install Python dependencies**. The application currently relies on the standard library, so this step simply keeps the work
space ready for future packages.

   ```bash
   pip install -r requirements.txt
   ```

7. **Prepare runtime directories**. The SQLite database and uploaded tender documents live inside the repository tree. Creating
   the folders ahead of time ensures correct permissions when the server first runs.

   ```bash
   mkdir -p tender_portal/data tender_portal/uploads
   chmod 755 tender_portal/data tender_portal/uploads
   ```

   - `tender_portal/data/portal.db` – default location of the SQLite database. Set the `TENDER_PORTAL_DB` environment variable i
     f you prefer a different path (e.g., on persistent storage).
   - `tender_portal/uploads/` – storage for tender attachments. Back up this folder with the database to retain historical recor
     ds.

8. **(Optional) Create convenience scripts**. For example, you can add a helper to `~/bin/start-tender-portal.sh` so the server 
   starts with a single command:

   ```bash
   mkdir -p ~/bin
   cat <<'EOF' > ~/bin/start-tender-portal.sh
   #!/usr/bin/env bash
   cd /opt/tender-portal
   source .venv/bin/activate
   exec python -m tender_portal.server
   EOF
   chmod +x ~/bin/start-tender-portal.sh
   ```

   Ensure `~/bin` is on your `PATH` (`echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc`).

## Getting started

1. **Install requirements** (only the Python standard library is used, so no external packages are necessary).
2. **Start the API server**:

   ```bash
   python -m tender_portal.server
   ```

   The server listens on `http://0.0.0.0:8000` by default. Static assets are served from `frontend/`.

3. **Open the web client** by visiting `http://localhost:8000/` in your browser.

4. **Sign in** with one of the demo users:

   | Role                | Username      | Password       |
   |---------------------|---------------|----------------|
   | System administrator| `admin`       | `Admin123!`    |
   | Procurement officer | `procurement` | `Procure123!`  |
   | Project manager     | `project`     | `Project123!`  |
   | Finance officer     | `finance`     | `Finance123!`  |
   | Viewer (read only)  | `viewer`      | `Viewer123!`   |

   Each role exposes the relevant parts of the system (tenders, finance, reports, etc.).

## Project structure

```
frontend/            # HTML/CSS/JS single-page client
└── app.js           # SPA logic (API calls, rendering, i18n)
└── index.html
└── styles.css

tender_portal/
├── __init__.py
├── auth.py          # User accounts, hashing, and sessions
├── database.py      # SQLite helpers and schema
├── models.py        # Business logic and reporting utilities
├── server.py        # HTTP API & static file server
└── uploads/         # Uploaded tender documents (created at runtime)

tests/
└── test_models.py   # Unit tests for core workflows
```

## Running the tests

The project ships with a `unittest` suite that exercises authentication, tender/project lifecycle, and notification generation.

```bash
python -m unittest
```

## Data storage

- SQLite database stored at `tender_portal/data/portal.db` by default.
- File uploads are saved under `tender_portal/uploads/`.
- To start with a fresh dataset, delete the database file before launching the server.

## Localization

The client application includes an Arabic/English translation dictionary. Users can switch the active language at runtime. Business data accepts both Arabic and English text (e.g., titles, descriptions) so that reports render correctly for bilingual stakeholders.

## Extending the platform

- Integrate with institutional authentication by replacing the session logic in `auth.py`.
- Add external reporting (Power BI, Tableau) using the CSV export and `models.financial_pipeline()` metrics.
- Schedule background tasks (e.g., cron) to call `models.generate_notifications()` for proactive reminders.

