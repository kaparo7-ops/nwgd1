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
  SpecificationBook,
  Supplier,
  Tender,
  TenderActivity,
  TenderPricing,

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

const defaultPricing = (currency: string): TenderPricing => ({
  basis: "flat",
  lines: [],
  summary: {
    baseCost: 0,
    marginValue: 0,
    shippingCost: 0,
    finalPrice: 0,
    currency
  }
});

export async function saveTender(
  tender: Partial<Tender> & { title?: string }
): Promise<Tender> {
  await latency();
  const id = tender.id ?? generateId("tender");
  const existingIndex = database.tenders.findIndex((item) => item.id === id);
  const existing = existingIndex >= 0 ? database.tenders[existingIndex] : undefined;

  if (!existing && !tender.title) {
    throw new Error("Title is required for new tenders");
  }

  const baseCurrency = tender.currency ?? existing?.currency ?? "USD";

  const defaults: Tender = {
    id,
    reference: existing?.reference ?? tender.reference ?? `TMP-${id.slice(-5)}`,
    title: existing?.title ?? tender.title ?? "Untitled tender",
    tenderType: existing?.tenderType ?? tender.tenderType ?? "RFP",
    agency: existing?.agency ?? tender.agency ?? "UN Agency",
    amount: existing?.amount ?? tender.amount ?? 0,
    currency: existing?.currency ?? tender.currency ?? "USD",
    owner: existing?.owner ?? tender.owner ?? "Procurement",
    status: existing?.status ?? tender.status ?? "preparing",
    statusReason: existing?.statusReason ?? tender.statusReason,
    tags: existing?.tags ?? tender.tags ?? [],
    submissionDate:
      existing?.submissionDate ?? tender.submissionDate ?? new Date().toISOString(),
    dueDate: existing?.dueDate ?? tender.dueDate ?? new Date().toISOString(),
    createdAt: existing?.createdAt ?? tender.createdAt ?? new Date().toISOString(),
    siteVisit: existing?.siteVisit ?? tender.siteVisit,
    specificationBooks: existing?.specificationBooks ?? tender.specificationBooks ?? [],
    proposals: existing?.proposals ?? tender.proposals ?? {},
    attachments: existing?.attachments ?? tender.attachments ?? [],
    links: existing?.links ?? tender.links ?? [],
    timeline: existing?.timeline ?? tender.timeline ?? [],
    pricing: existing?.pricing ?? tender.pricing ?? defaultPricing(baseCurrency),
    supplierComparisons:
      existing?.supplierComparisons ?? tender.supplierComparisons ?? [],
    alerts: existing?.alerts ?? tender.alerts ?? {
      submissionReminderAt: null,
      needsSpecificationPurchase: true,
      siteVisitOverdue: false,
      guaranteeAlert: null
    },
    description: existing?.description ?? tender.description ?? ""
  };

  const updated: Tender = {
    ...defaults,
    ...tender,
    reference: tender.reference ?? defaults.reference,
    title: tender.title ?? defaults.title,
    tenderType: tender.tenderType ?? defaults.tenderType,
    agency: tender.agency ?? defaults.agency,
    amount: tender.amount ?? defaults.amount,
    currency: tender.currency ?? defaults.currency,
    owner: tender.owner ?? defaults.owner,
    status: tender.status ?? defaults.status,
    statusReason:
      tender.status === "lost" || tender.status === "cancelled"
        ? tender.statusReason ?? defaults.statusReason ?? ""
        : tender.statusReason ?? defaults.statusReason,
    tags: tender.tags ?? defaults.tags,
    submissionDate: tender.submissionDate ?? defaults.submissionDate,
    dueDate: tender.dueDate ?? defaults.dueDate,
    createdAt: tender.createdAt ?? defaults.createdAt,
    siteVisit: tender.siteVisit ?? defaults.siteVisit,
    specificationBooks: tender.specificationBooks ?? defaults.specificationBooks,
    proposals: { ...defaults.proposals, ...tender.proposals },
    attachments: tender.attachments ?? defaults.attachments,
    links: tender.links ?? defaults.links,
    timeline: tender.timeline ?? defaults.timeline,
    pricing: {
      ...defaults.pricing,
      ...tender.pricing,
      lines: tender.pricing?.lines ?? defaults.pricing.lines,
      summary: {
        ...defaults.pricing.summary,
        ...tender.pricing?.summary,
        currency: tender.pricing?.summary?.currency ?? defaults.pricing.summary.currency
      }
    },
    supplierComparisons: tender.supplierComparisons ?? defaults.supplierComparisons,
    alerts: { ...defaults.alerts, ...tender.alerts },
    description: tender.description ?? defaults.description
  };

  if (existingIndex >= 0) {
    database.tenders[existingIndex] = updated;
  } else {
    database.tenders.unshift(updated);
  }

  persist(database);
  return updated;

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

export async function updateSpecificationBook(
  tenderId: string,
  book: SpecificationBook
): Promise<Tender> {
  await latency();
  const tenderIndex = database.tenders.findIndex((item) => item.id === tenderId);
  if (tenderIndex === -1) {
    throw new Error("Tender not found");
  }

  const tender = database.tenders[tenderIndex];
  const nextBooks = tender.specificationBooks.map((existing) =>
    existing.id === book.id ? book : existing
  );

  database.tenders[tenderIndex] = {
    ...tender,
    specificationBooks: nextBooks,
    alerts: {
      ...tender.alerts,
      needsSpecificationPurchase: nextBooks.every(
        (entry) => !entry.purchaseDate || entry.purchaseDate === ""
      )
    }
  };

  persist(database);
  return database.tenders[tenderIndex];
}

export async function appendTenderActivity(
  tenderId: string,
  activity: TenderActivity
): Promise<Tender> {
  await latency();
  const tenderIndex = database.tenders.findIndex((item) => item.id === tenderId);
  if (tenderIndex === -1) {
    throw new Error("Tender not found");
  }

  database.tenders[tenderIndex] = {
    ...database.tenders[tenderIndex],
    timeline: [...database.tenders[tenderIndex].timeline, activity]
  };

  persist(database);
  return database.tenders[tenderIndex];
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
    "Type",
    "Agency",
    "Assignee",
    "Status",
    "Status reason",
    "Offer amount",
    "Currency",
    "Submission",
    "Due",
    "Tags",
    "Specification purchased",
    "Site visit",
    "Technical link",
    "Financial link"

  ];
  const rows = database.tenders.map((tender) => [
    tender.reference,
    tender.title,
    tender.tenderType,
    tender.agency,
    tender.owner,
    tender.status,
    tender.statusReason ?? "",
    tender.amount.toString(),
    tender.currency,
    tender.submissionDate,
    tender.dueDate,
    tender.tags.join(" | "),
    tender.specificationBooks.some((book) => book.purchaseDate) ? "Yes" : "No",
    tender.siteVisit?.date ?? "",
    tender.proposals.technicalUrl ?? "",
    tender.proposals.financialUrl ?? ""

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
