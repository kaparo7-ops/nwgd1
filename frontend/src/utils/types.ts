export type Role = "admin" | "procurement" | "finance" | "project" | "viewer";

export type TenderStatus = "preparing" | "submitted" | "won" | "lost" | "cancelled";

export type TenderType = "RFQ" | "ITB" | "RFP" | "EOI" | "Other";

export type TenderLinkType = "technical" | "financial" | "general";

export type TenderLink = {
  id: string;
  label: string;
  url: string;
  type: TenderLinkType;
};

export type TenderSiteVisit = {
  required: boolean;
  completed: boolean;
  photos: Attachment[];
  date?: string | null;
  assignee?: string;
  notes?: string;
};

export type SpecificationBook = {
  id: string;
  number: string;
  purchaseDate?: string | null;
  cost: number;
  currency: string;
  purchaseMethod: string;
  responsible: string;
  attachment?: Attachment | null;
};

export type TenderProposal = {
  technicalUrl?: string;
  financialUrl?: string;
  submittedBy?: string;
  submittedAt?: string;
};

export type TenderActivity = {
  id: string;
  date: string;
  actor: string;
  description: string;
  category: "status" | "update" | "reminder" | "note";
};

export type TenderPricingLine = {
  id: string;
  item: string;
  unitCost: number;
  quantity: number;
  margin: number;
  shipping: number;
  total: number;
  currency: string;
  supplier?: string;
};

export type TenderPricing = {
  basis: "cbm" | "weight" | "flat";
  lines: TenderPricingLine[];
  summary: {
    baseCost: number;
    marginValue: number;
    shippingCost: number;
    finalPrice: number;
    currency: string;
  };
};

export type SupplierComparison = {
  item: string;
  suppliers: Array<{
    name: string;
    unitCost: number;
    currency: string;
  }>;
  preferred?: string;
};

export type TenderAlerts = {
  submissionReminderAt: string | null;
  needsSpecificationPurchase: boolean;
  siteVisitOverdue: boolean;
  guaranteeAlert?: string | null;
};


export type ProjectStatus = "planning" | "executing" | "delayed" | "closed";

export type InvoiceStatus = "draft" | "submitted" | "paid" | "overdue";

export type Tender = {
  id: string;
  reference: string;
  title: string;
  tenderType: TenderType;
  agency: string;
  amount: number;
  currency: string;
  owner: string;
  status: TenderStatus;
  statusReason?: string;
  tags: string[];
  submissionDate: string;
  dueDate: string;
  createdAt: string;
  siteVisit?: TenderSiteVisit;
  specificationBooks: SpecificationBook[];
  proposals: TenderProposal;
  attachments: Attachment[];
  links: TenderLink[];
  timeline: TenderActivity[];
  pricing: TenderPricing;
  supplierComparisons: SupplierComparison[];
  alerts: TenderAlerts;
  description: string;
};

export type Project = {
  id: string;
  tenderId: string;
  name: string;
  manager: string;
  budget: number;
  spent: number;
  received: number;
  profitLyd: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  riskLevel: "low" | "medium" | "high";
  guarantee: {
    amount: number;
    start: string;
    expiry: string;
    retained: number;
  };
  timeline: Array<{
    label: string;
    date: string;
    status: "complete" | "in-progress" | "blocked";
  }>;
  invoices: Invoice[];
  suppliers: Supplier[];
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  rating: number;
  contact: string;
  email: string;
  phone: string;
  country: string;
};

export type Invoice = {
  id: string;
  projectId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
};

export type Attachment = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploader: string;
  previewUrl?: string;
};

export type Notification = {
  id: string;
  type: "tender" | "project" | "invoice";
  message: string;
  level: "info" | "warning" | "danger";
  date: string;
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  change: number;
};

export type PipelineBreakdown = {
  stage: string;
  value: number;
};

export type CashflowPoint = {
  month: string;
  pipeline: number;
  invoices: number;
  expenses: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};
