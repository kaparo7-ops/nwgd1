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
- **Bilingual UI** – toggle Arabic/English labels instantly from the client. Every component flips direction (LTR/RTL) and typography using shared theme tokens.
- **Sample dataset** – first run seeds realistic tenders, projects, suppliers, invoices, and alerts so the dashboards are immediately informative.
- **Modern SPA** – React + Vite + Tailwind CSS with shadcn/ui primitives, lucide-react icons, Recharts visualisations, and React Query caching.

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
   starts with a single command. Because `.venv/` is ignored by Git (see `.gitignore`), you can safely create the virtual
   environment directly inside the project directory without polluting commits:

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

9. **Keep the server running after logout (optional)**. If you want the URL (e.g., `http://10.2.1.91:8000`) to stay up even when
   you close your SSH session, create a `systemd` service:

   ```bash
   sudo tee /etc/systemd/system/tender-portal.service > /dev/null <<EOF
   [Unit]
   Description=Tender & Project Management Portal
   After=network.target

   [Service]
   Type=simple
   User=$(whoami)
   WorkingDirectory=/opt/tender-portal
   Environment="TENDER_PORTAL_DB=/opt/tender-portal/tender_portal/data/portal.db"
   ExecStart=/opt/tender-portal/.venv/bin/python -m tender_portal.server
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   EOF

   sudo systemctl daemon-reload
   sudo systemctl enable tender-portal.service
   sudo systemctl start tender-portal.service
   ```

   Adjust `User=` if the service should run under a dedicated account. The portal will now auto-start on boot and can be
   managed with `sudo systemctl status|stop|restart tender-portal.service`.


## Frontend (React + Vite)

The SPA lives under `frontend/` and uses React 18, Vite, Tailwind CSS, shadcn/ui primitives, lucide-react icons, Recharts, and React Query. Install Node.js 18+ and then run:

```bash
cd frontend
npm install                # install dependencies
npm run dev                # start the Vite dev server on http://localhost:5173
npm run build              # produce production assets under frontend/dist
npm run preview            # preview the built bundle locally
npm run lint               # ESLint (TypeScript + React hooks rules)
npm run test               # Vitest smoke tests (React Testing Library)
```

### UI quick start

- **Language toggle** – switch between English and Arabic from the header. Layout direction, fonts, and badge alignment flip instantly, and the preference is saved in `localStorage`.
- **Command palette** – press <kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd> to jump to Dashboard, Tenders, Projects, Suppliers, Finance, Reports, or Admin.
- **Filters drawer** – every data table has a sticky-header layout with search, multi-select filters, saveable presets, pagination, CSV export, empty-state messaging, and virtualization for large datasets.
- **Data export** – download pipeline CSVs from the tenders table or the Reports page. Attachments can be uploaded with inline previews.
- **RTL-aware charts** – Recharts line/bar charts mirror labels when Arabic is active, ensuring correct axis reading.
- **Access control demo** – pick a role in the header to see actions hide/disable for Procurement, Finance, Project, Admin, or Viewer personas.

### Frontend folder structure

```
frontend/
  src/
    components/      # shadcn-inspired UI primitives, advanced table, forms, charts, overlays
    pages/           # dashboard, tenders, projects, suppliers, finance, reports, admin
    services/        # mock API backed by the seeded dataset + localStorage persistence
    providers/       # language (i18n + RTL) and role/permission contexts
    theme/           # design tokens for colours, typography, spacing, radius, shadows
    __tests__/       # Vitest smoke tests with React Testing Library helpers
```

`npm run build` outputs static assets that can be served behind the Python API (copy `frontend/dist` to your web server or configure the backend to serve the files directly).

## Getting started

1. **Install requirements** (only the Python standard library is used, so no external packages are necessary).
2. **Start the API server**:

   ```bash
   python -m tender_portal.server
   ```

   The server listens on `http://0.0.0.0:8000` by default. During development run the Vite dev server in another terminal (`npm run dev` inside `frontend/`) and browse to `http://localhost:5173/`. For production copy `frontend/dist` into your web tier or configure the Python server to serve the built assets.

3. **Open the web client** by visiting the Vite URL above (or the deployed static host) in your browser.


4. **Sign in** with one of the demo users:

   | Role                | Username      | Password       |
   |---------------------|---------------|----------------|
   | System administrator| `admin`       | `Admin123!`    |
   | Procurement officer | `procurement` | `Procure123!`  |
   | Project manager     | `project`     | `Project123!`  |
   | Finance officer     | `finance`     | `Finance123!`  |
   | Viewer (read only)  | `viewer`      | `Viewer123!`   |

   Each role exposes the relevant parts of the system (tenders, finance, reports, etc.).

## Demo dataset

The first time the API starts with an empty SQLite database it automatically loads a small but realistic dataset:

- Key suppliers for construction, logistics, and renewable energy work.
- Four tenders across RFQ/ITB/RFP types with mixed statuses and upcoming deadlines.
- Two linked projects with financial data, guarantees, and assigned suppliers.
- Invoices that drive the finance pipeline and trigger overdue alerts.
- Notifications for tenders closing soon, guarantees about to expire, and unpaid invoices.

This seeded content ensures the new dashboard and reports render meaningful charts immediately after deployment. To start from a clean slate, delete `tender_portal/data/portal.db` (and any uploaded files) before restarting the server.

## Project structure

```
frontend/
├── index.html                # Vite entry point with font preloads
├── package.json              # React/Vite/Tailwind dependencies and scripts
├── tailwind.config.ts        # Design tokens and custom variants
├── vite.config.ts            # Vite + Vitest configuration
└── src/
    ├── App.tsx               # Mounts the router shell
    ├── index.css             # Tailwind base styles and scrollbar tweaks
    ├── components/           # shadcn-style UI primitives, data table, charts, overlays
    ├── data/                 # Seed dataset used by the mock API
    ├── pages/                # Dashboard, Tenders, Projects, Suppliers, Finance, Reports, Admin
    ├── providers/            # Language + auth context providers
    ├── services/             # Mock API with localStorage persistence
    ├── theme/                # Global colour/spacing/typography tokens
    └── __tests__/            # Vitest smoke tests for dashboard + data table


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

- **Backend** – `python -m unittest`
- **Frontend** – `cd frontend && npm run test`

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

