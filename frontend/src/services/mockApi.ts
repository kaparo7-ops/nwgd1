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
  TenderPricingLine,
  TenderPricingSummary,
  TenderSiteVisit,
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

type SpecificationBookInput = Omit<SpecificationBook, "purchased"> & { purchased?: boolean };

const normalizeSpecificationBook = (book: SpecificationBookInput): SpecificationBook => ({
  ...book,
  purchased: book.purchased ?? Boolean(book.purchaseDate),
  purchaseDate: book.purchaseDate ?? null,
  cost: book.cost ?? 0,
  currency: book.currency ?? "USD",
  purchaseMethod: book.purchaseMethod ?? "",
  responsible: book.responsible ?? "",
  attachment: book.attachment ?? null
});

const normalizeSpecificationBooks = (
  books?: SpecificationBookInput[]
): SpecificationBook[] => (books ?? []).map(normalizeSpecificationBook);

function loadDatabase(): DatabaseShape {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as DatabaseShape;
    parsed.tenders = parsed.tenders.map((tender) => ({
      ...tender,
      specificationBooks: normalizeSpecificationBooks(tender.specificationBooks),
      pricing: normalizePricing(tender.pricing)
    }));
    return parsed;
  }

  const db: DatabaseShape = {
    tenders: seedTenders.map((tender) => ({
      ...tender,
      specificationBooks: normalizeSpecificationBooks(tender.specificationBooks),
      pricing: normalizePricing(tender.pricing)
    })),
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
    const parsed = JSON.parse(event.newValue) as DatabaseShape;
    parsed.tenders = parsed.tenders.map((tender) => ({
      ...tender,
      specificationBooks: normalizeSpecificationBooks(tender.specificationBooks),
      pricing: normalizePricing(tender.pricing)
    }));
    database = parsed;
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

const createEmptySummary = (): TenderPricingSummary => ({
  subtotalUsd: 0,
  subtotalLyd: 0,
  marginUsd: 0,
  marginLyd: 0,
  shippingUsd: 0,
  shippingLyd: 0,
  totalUsd: 0,
  totalLyd: 0,
  fxMissing: false
});

const summarizePricing = (lines: TenderPricingLine[]): TenderPricingSummary => {
  const sum = (key: keyof TenderPricingLine) =>
    lines.reduce((acc, line) => acc + (typeof line[key] === "number" ? (line[key] as number) : 0), 0);

  return {
    subtotalUsd: sum("subtotalUsd"),
    subtotalLyd: sum("subtotalLyd"),
    marginUsd: sum("marginUsd"),
    marginLyd: sum("marginLyd"),
    shippingUsd: sum("shippingUsd"),
    shippingLyd: sum("shippingLyd"),
    totalUsd: sum("totalUsd"),
    totalLyd: sum("totalLyd"),
    fxMissing: lines.some((line) => line.fxRate === null)
  } satisfies TenderPricingSummary;
};

const defaultPricing = (): TenderPricing => ({
  lines: [],
  summary: createEmptySummary()
});

const normalizePricingLine = (line: Partial<TenderPricingLine> & { id: string; item: string }): TenderPricingLine => {
  if (typeof line.unitCostUsd === "number" && typeof line.subtotalUsd === "number") {
    const normalized: TenderPricingLine = {
      id: line.id,
      item: line.item,
      quantity: line.quantity ?? 0,
      unitCostUsd: line.unitCostUsd ?? 0,
      unitCostLyd: line.unitCostLyd ?? 0,
      fxRate: typeof line.fxRate === "number" && Number.isFinite(line.fxRate) ? line.fxRate : null,
      marginPercent: line.marginPercent ?? 0,
      marginUsd: line.marginUsd ?? 0,
      marginLyd: line.marginLyd ?? 0,
      shippingUsd: line.shippingUsd ?? 0,
      shippingLyd: line.shippingLyd ?? 0,
      subtotalUsd: line.subtotalUsd ?? 0,
      subtotalLyd: line.subtotalLyd ?? 0,
      totalUsd: line.totalUsd ?? 0,
      totalLyd: line.totalLyd ?? 0,
      supplier: line.supplier
    };
    return normalized;
  }

  const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0;
  const unitCostUsd = Number.isFinite(Number((line as any).unitCost))
    ? Number((line as any).unitCost)
    : 0;
  const marginPercent = Number.isFinite(Number((line as any).margin)) ? Number((line as any).margin) : 0;
  const shippingUsd = Number.isFinite(Number((line as any).shipping)) ? Number((line as any).shipping) : 0;
  const subtotalUsd = unitCostUsd * quantity;
  const marginUsd = subtotalUsd * (marginPercent / 100);
  const totalUsd = subtotalUsd + marginUsd + shippingUsd;

  return {
    id: line.id,
    item: line.item,
    quantity,
    unitCostUsd,
    unitCostLyd: 0,
    fxRate: null,
    marginPercent,
    marginUsd,
    marginLyd: 0,
    shippingUsd,
    shippingLyd: 0,
    subtotalUsd,
    subtotalLyd: 0,
    totalUsd,
    totalLyd: 0,
    supplier: line.supplier
  };
};

const normalizePricing = (pricing?: Partial<TenderPricing> & { lines?: any[] }): TenderPricing => {
  if (!pricing) {
    return defaultPricing();
  }

  const lines: TenderPricingLine[] = Array.isArray(pricing.lines)
    ? pricing.lines
        .filter((line): line is Partial<TenderPricingLine> & { id: string; item: string } =>
          Boolean(line?.id) && Boolean(line?.item)
        )
        .map((line) => normalizePricingLine(line))
    : [];

  return {
    lines,
    summary: summarizePricing(lines)
  };
};

const mergePricing = (existing: TenderPricing, incoming?: Partial<TenderPricing>): TenderPricing => {
  if (!incoming) {
    return existing;
  }
  const normalizedIncoming = normalizePricing(incoming);
  const lines = normalizedIncoming.lines.length > 0 ? normalizedIncoming.lines : existing.lines;
  return {
    lines,
    summary: summarizePricing(lines)
  };
};

const mergeSiteVisit = (
  existing?: TenderSiteVisit,
  incoming?: Partial<TenderSiteVisit>
): TenderSiteVisit | undefined => {
  if (!existing && !incoming) return undefined;

  const has = (key: keyof TenderSiteVisit) =>
    incoming ? Object.prototype.hasOwnProperty.call(incoming, key) : false;

  const next: TenderSiteVisit = {
    required: has("required")
      ? Boolean(incoming?.required)
      : existing?.required ?? false,
    completed: has("completed")
      ? Boolean(incoming?.completed)
      : existing?.completed ?? false,
    photos: incoming?.photos ? [...incoming.photos] : [...(existing?.photos ?? [])],
    date: has("date") ? incoming?.date ?? null : existing?.date ?? null,
    assignee: has("assignee") ? incoming?.assignee : existing?.assignee,
    notes: has("notes") ? incoming?.notes : existing?.notes
  };

  if (
    !next.required &&
    !next.completed &&
    !next.date &&
    !next.assignee &&
    !next.notes &&
    next.photos.length === 0
  ) {
    return undefined;
  }

  return next;
};

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

  const mergedSiteVisit = mergeSiteVisit(existing?.siteVisit, tender.siteVisit);

  const existingPricing = existing?.pricing ? normalizePricing(existing.pricing) : defaultPricing();
  const incomingPricing = tender.pricing ? normalizePricing(tender.pricing) : undefined;

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
    siteVisit: mergedSiteVisit,
    specificationBooks: normalizeSpecificationBooks(
      existing?.specificationBooks ?? tender.specificationBooks ?? []
    ),
    proposals: existing?.proposals ?? tender.proposals ?? {},
    attachments: existing?.attachments ?? tender.attachments ?? [],
    links: existing?.links ?? tender.links ?? [],
    timeline: existing?.timeline ?? tender.timeline ?? [],
    pricing: existingPricing,
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
    siteVisit: mergeSiteVisit(defaults.siteVisit ?? undefined, tender.siteVisit),
    specificationBooks: normalizeSpecificationBooks(
      tender.specificationBooks ?? defaults.specificationBooks
    ),
    proposals: { ...defaults.proposals, ...tender.proposals },
    attachments: tender.attachments ?? defaults.attachments,
    links: tender.links ?? defaults.links,
    timeline: tender.timeline ?? defaults.timeline,
    pricing: mergePricing(existingPricing, incomingPricing),
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

const toFileArray = (files: File[] | FileList): File[] =>
  Array.isArray(files) ? files : Array.from(files);

export async function uploadAttachment(
  tenderId: string,
  files: File[] | FileList,
  uploader: string,
  options?: { target?: "attachments" | "siteVisit" }
): Promise<Attachment[]> {
  await latency();
  const tender = database.tenders.find((item) => item.id === tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  const uploaded: Attachment[] = toFileArray(files).map((file) => ({
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

  if (options?.target === "siteVisit") {
    const existingVisit: TenderSiteVisit =
      tender.siteVisit ?? {
        required: true,
        completed: false,
        photos: [],
        date: null,
        assignee: uploader
      };
    const combinedPhotos = [...uploaded, ...existingVisit.photos];
    const updatedVisit = mergeSiteVisit(existingVisit, {
      ...existingVisit,
      photos: combinedPhotos
    });
    tender.siteVisit = updatedVisit;
    persist(database);
    return tender.siteVisit?.photos ?? [];
  }

  tender.attachments = [...uploaded, ...tender.attachments];
  persist(database);
  return tender.attachments;
}

export async function removeAttachment(
  tenderId: string,
  attachmentId: string,
  options?: { target?: "attachments" | "siteVisit" }
): Promise<Attachment[]> {
  await latency();
  const tender = database.tenders.find((item) => item.id === tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  if (options?.target === "siteVisit") {
    if (!tender.siteVisit) {
      return [];
    }
    const remainingPhotos = tender.siteVisit.photos.filter((photo) => photo.id !== attachmentId);
    const updatedVisit = mergeSiteVisit(tender.siteVisit, {
      ...tender.siteVisit,
      photos: remainingPhotos
    });
    tender.siteVisit = updatedVisit;
    persist(database);
    return tender.siteVisit?.photos ?? [];
  }

  tender.attachments = tender.attachments.filter((item) => item.id !== attachmentId);
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
  const normalizedBook = normalizeSpecificationBook(book);
  const nextBooks = tender.specificationBooks.map((existing) =>
    existing.id === normalizedBook.id ? normalizedBook : existing
  );

  database.tenders[tenderIndex] = {
    ...tender,
    specificationBooks: nextBooks,
    alerts: {
      ...tender.alerts,
      needsSpecificationPurchase: nextBooks.every((entry) => !entry.purchased)
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

const tenderExportColumns: Record<
  string,
  { label: string; getValue: (tender: Tender, locale?: string) => string }
> = {
  reference: { label: "Reference", getValue: (tender) => tender.reference },
  title: { label: "Title", getValue: (tender) => tender.title },
  tenderType: { label: "Type", getValue: (tender) => tender.tenderType },
  agency: { label: "Agency", getValue: (tender) => tender.agency },
  owner: { label: "Assignee", getValue: (tender) => tender.owner },
  status: { label: "Status", getValue: (tender) => tender.status },
  statusReason: {
    label: "Status reason",
    getValue: (tender) => tender.statusReason ?? ""
  },
  dueDate: {
    label: "Due date",
    getValue: (tender, locale) => formatDate(tender.dueDate, locale)
  },
  submissionDate: {
    label: "Submission date",
    getValue: (tender, locale) => formatDate(tender.submissionDate, locale)
  },
  amount: {
    label: "Offer amount",
    getValue: (tender, locale) => formatCurrency(tender.amount, tender.currency, locale)
  },
  tags: {
    label: "Tags",
    getValue: (tender) => tender.tags.join(" | ")
  },
  specification: {
    label: "Specification purchased",
    getValue: (tender) =>
      tender.specificationBooks.some((book) => book.purchased) ? "Yes" : "No"
  },
  siteVisit: {
    label: "Site visit status",
    getValue: (tender, locale) => {
      if (!tender.siteVisit) {
        return locale === "ar" ? "لم تُحدد" : "Not scheduled";
      }
      const requiredText = tender.siteVisit.required
        ? locale === "ar"
          ? "مطلوبة"
          : "Required"
        : locale === "ar"
          ? "اختيارية"
          : "Optional";
      const completionText = tender.siteVisit.completed
        ? locale === "ar"
          ? "مكتملة"
          : "Completed"
        : locale === "ar"
          ? "قيد التنفيذ"
          : "Pending";
      return `${requiredText} | ${completionText}`;
    }
  },
  siteVisitDate: {
    label: "Site visit date",
    getValue: (tender, locale) => formatDate(tender.siteVisit?.date, locale)
  },
  siteVisitAssignee: {
    label: "Site visit assignee",
    getValue: (tender) => tender.siteVisit?.assignee ?? ""
  },
  technicalUrl: {
    label: "Technical link",
    getValue: (tender) => tender.proposals.technicalUrl ?? ""
  },
  financialUrl: {
    label: "Financial link",
    getValue: (tender) => tender.proposals.financialUrl ?? ""
  }
};

const formatDate = (value: string | null | undefined, locale?: string) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale ?? "en", { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch (error) {
    return new Date(value).toLocaleDateString();
  }
};

const formatCurrency = (value: number, currency: string, locale?: string) => {
  try {
    return new Intl.NumberFormat(locale ?? "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    return `${currency} ${value.toLocaleString()}`;
  }
};

export async function exportTendersCsv(options?: {
  rows?: Tender[];
  visibleColumns?: string[];
  locale?: string;
}): Promise<string> {
  await latency(100, 200);
  const dataset = options?.rows ?? database.tenders;
  const locale = options?.locale ?? "en";
  const columnIds = (options?.visibleColumns?.length
    ? options.visibleColumns
    : Object.keys(tenderExportColumns)
  ).filter((columnId) => tenderExportColumns[columnId]);

  const header = columnIds.map((columnId) => tenderExportColumns[columnId].label);
  const rows = dataset.map((tender) =>
    columnIds.map((columnId) => tenderExportColumns[columnId].getValue(tender, locale))
  );

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))

    .join("\n");
}

const pricingHeaders = [
  "Item",
  "Supplier",
  "Quantity",
  "Unit USD",
  "Unit LYD",
  "FX rate",
  "Subtotal USD",
  "Subtotal LYD",
  "Margin %",
  "Margin USD",
  "Margin LYD",
  "Shipping USD",
  "Shipping LYD",
  "Total USD",
  "Total LYD"
];

const formatNumber = (value: number) => {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "0.00";
};

const buildPricingMatrix = (pricing: TenderPricing) => {
  const rows = pricing.lines.map((line) => [
    line.item,
    line.supplier ?? "",
    formatNumber(line.quantity),
    formatNumber(line.unitCostUsd),
    formatNumber(line.unitCostLyd),
    line.fxRate === null ? "" : formatNumber(line.fxRate),
    formatNumber(line.subtotalUsd),
    formatNumber(line.subtotalLyd),
    formatNumber(line.marginPercent),
    formatNumber(line.marginUsd),
    formatNumber(line.marginLyd),
    formatNumber(line.shippingUsd),
    formatNumber(line.shippingLyd),
    formatNumber(line.totalUsd),
    formatNumber(line.totalLyd)
  ]);

  const summary = pricing.summary;
  const totalsRow = [
    "Totals",
    "",
    "",
    "",
    "",
    summary.fxMissing ? "FX missing" : "",
    formatNumber(summary.subtotalUsd),
    formatNumber(summary.subtotalLyd),
    "",
    formatNumber(summary.marginUsd),
    formatNumber(summary.marginLyd),
    formatNumber(summary.shippingUsd),
    formatNumber(summary.shippingLyd),
    formatNumber(summary.totalUsd),
    formatNumber(summary.totalLyd)
  ];

  return [...rows, totalsRow];
};

export async function exportTenderPricingCsv(tenderId: string): Promise<string> {
  await latency(80, 160);
  const tender = database.tenders.find((entry) => entry.id === tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  const pricing = normalizePricing(tender.pricing);
  const matrix = buildPricingMatrix(pricing);
  const table = [pricingHeaders, ...matrix];

  return table.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function exportTenderPricingExcel(tenderId: string): Promise<Blob> {
  await latency(80, 160);
  const tender = database.tenders.find((entry) => entry.id === tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  const pricing = normalizePricing(tender.pricing);
  const rows = buildPricingMatrix(pricing);

  const htmlRows = [
    `<tr>${pricingHeaders.map((header) => `<th>${header}</th>`).join("")}</tr>`,
    ...rows.map(
      (row) => `<tr>${row.map((cell) => `<td>${cell || ""}</td>`).join("")}</tr>`
    )
  ].join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1">${htmlRows}</table></body></html>`;
  return new Blob([html], { type: "application/vnd.ms-excel" });
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
    tenders: seedTenders.map((tender) => ({
      ...tender,
      specificationBooks: normalizeSpecificationBooks(tender.specificationBooks),
      pricing: normalizePricing(tender.pricing)
    })),
    projects: seedProjects,
    suppliers: seedSuppliers,
    invoices: seedInvoices,
    notifications: seedNotifications,
    users: seedUsers
  };
  persist(database);
  return database;
}
