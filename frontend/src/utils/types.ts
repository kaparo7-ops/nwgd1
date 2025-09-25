export type Role = "admin" | "procurement" | "finance" | "project" | "viewer";

export type TenderStatus =
  | "draft"
  | "shared"
  | "in-progress"
  | "awarded"
  | "lost"
  | "paused"
  | "cancelled";

export type ProjectStatus = "planning" | "executing" | "delayed" | "closed";

export type InvoiceStatus = "draft" | "submitted" | "paid" | "overdue";

export type Tender = {
  id: string;
  reference: string;
  title: string;
  agency: string;
  amount: number;
  currency: string;
  owner: string;
  status: TenderStatus;
  submissionDate: string;
  dueDate: string;
  createdAt: string;
  attachments: Attachment[];
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
