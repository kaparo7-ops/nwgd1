import {
  cashflow,
  dashboardMetrics,
  invoices as seedInvoices,
  notifications as seedNotifications,
  pipelineBreakdown,
  projects as seedProjects,
  suppliers as seedSuppliers,
  tenders as seedTenders,
  users as seedUsers
} from "@/data/seed";
import type {
  Attachment,
  CashflowPoint,
  DashboardMetric,
  Invoice,
  Notification,
  PipelineBreakdown,
  Project,
  Supplier,
  Tender,
  User
} from "@/utils/types";

const STORAGE_KEY = "tender-portal-demo";

type DatabaseShape = {
  tenders: Tender[];
  projects: Project[];
  suppliers: Supplier[];
  invoices: Invoice[];
  notifications: Notification[];
  users: User[];
};

const latency = (min = 200, max = 650) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min));

function loadDatabase(): DatabaseShape {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as DatabaseShape;
  }

  const db: DatabaseShape = {
    tenders: seedTenders,
    projects: seedProjects,
    suppliers: seedSuppliers,
    invoices: seedInvoices,
    notifications: seedNotifications,
    users: seedUsers
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function persist(db: DatabaseShape) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let database = loadDatabase();

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    database = JSON.parse(event.newValue) as DatabaseShape;
  }
});

const generateId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export async function fetchDashboard() {
  await latency();
  return {
    metrics: dashboardMetrics,
    pipeline: pipelineBreakdown,
    cashflow,
    notifications: database.notifications
  } as {
    metrics: DashboardMetric[];
    pipeline: PipelineBreakdown[];
    cashflow: CashflowPoint[];
    notifications: Notification[];
  };
}

export async function listTenders(): Promise<Tender[]> {
  await latency();
  return [...database.tenders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function getTender(id: string): Promise<Tender | undefined> {
  await latency();
  return database.tenders.find((tender) => tender.id === id);
}

export async function saveTender(tender: Partial<Tender> & { title: string }): Promise<Tender> {
  await latency();
  const id = tender.id ?? generateId("tender");
  const existingIndex = database.tenders.findIndex((item) => item.id === id);
  const record: Tender = {
    id,
    reference: tender.reference ?? `TMP-${id.slice(-5)}`,
    title: tender.title,
    agency: tender.agency ?? "UN Agency",
    amount: tender.amount ?? 0,
    currency: tender.currency ?? "USD",
    owner: tender.owner ?? "Procurement",
    status: tender.status ?? "draft",
    submissionDate: tender.submissionDate ?? new Date().toISOString(),
    dueDate: tender.dueDate ?? new Date().toISOString(),
    createdAt: tender.createdAt ?? new Date().toISOString(),
    attachments: tender.attachments ?? [],
    description: tender.description ?? ""
  };

  if (existingIndex >= 0) {
    database.tenders[existingIndex] = { ...database.tenders[existingIndex], ...record };
  } else {
    database.tenders.unshift(record);
  }

  persist(database);
  return record;
}

export async function uploadAttachment(
  tenderId: string,
  files: FileList,
  uploader: string
): Promise<Attachment[]> {
  await latency();
  const tender = database.tenders.find((item) => item.id === tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  const uploaded: Attachment[] = Array.from(files).map((file) => ({
    id: generateId("att"),
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    uploader,
    previewUrl:
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : undefined
  }));

  tender.attachments = [...uploaded, ...tender.attachments];
  persist(database);
  return tender.attachments;
}

export async function listProjects(): Promise<Project[]> {
  await latency();
  return database.projects;
}

export async function getProject(id: string) {
  await latency();
  return database.projects.find((project) => project.id === id);
}

export async function listSuppliers(): Promise<Supplier[]> {
  await latency();
  return database.suppliers;
}

export async function listInvoices(): Promise<Invoice[]> {
  await latency();
  return database.invoices;
}

export async function listUsers(): Promise<User[]> {
  await latency();
  return database.users;
}

export async function exportTendersCsv(): Promise<string> {
  await latency(100, 200);
  const header = [
    "Reference",
    "Title",
    "Agency",
    "Owner",
    "Status",
    "Amount",
    "Currency",
    "Submission",
    "Due"
  ];
  const rows = database.tenders.map((tender) => [
    tender.reference,
    tender.title,
    tender.agency,
    tender.owner,
    tender.status,
    tender.amount.toString(),
    tender.currency,
    tender.submissionDate,
    tender.dueDate
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
}

export async function saveInvoice(invoice: Partial<Invoice> & { amount: number }) {
  await latency();
  const id = invoice.id ?? generateId("invoice");
  const record: Invoice = {
    id,
    projectId: invoice.projectId ?? "",
    number: invoice.number ?? `INV-${id.slice(-6)}`,
    issueDate: invoice.issueDate ?? new Date().toISOString(),
    dueDate: invoice.dueDate ?? new Date().toISOString(),
    amount: invoice.amount,
    currency: invoice.currency ?? "USD",
    status: invoice.status ?? "draft"
  };
  const existingIndex = database.invoices.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    database.invoices[existingIndex] = { ...database.invoices[existingIndex], ...record };
  } else {
    database.invoices.unshift(record);
  }
  persist(database);
  return record;
}

export async function resetDemo() {
  await latency(50, 90);
  database = {
    tenders: seedTenders,
    projects: seedProjects,
    suppliers: seedSuppliers,
    invoices: seedInvoices,
    notifications: seedNotifications,
    users: seedUsers
  };
  persist(database);
  return database;
}
