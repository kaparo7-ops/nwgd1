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

const now = new Date();

const date = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

const attachments: Attachment[] = [
  {
    id: "att-1",
    fileName: "TOR-UNICEF-WASH.pdf",
    fileSize: 5242880,
    uploadedAt: date(-10),
    uploader: "Amina Al-Senussi",
    previewUrl: "https://dummyimage.com/600x400/0057b8/ffffff&text=TOR"
  },
  {
    id: "att-2",
    fileName: "Bill_of_Quantities.xlsx",
    fileSize: 2345678,
    uploadedAt: date(-8),
    uploader: "Salem Haddad",
    previewUrl: "https://dummyimage.com/600x400/00a19a/ffffff&text=BoQ"
  }
];

export const tenders: Tender[] = [
  {
    id: "tender-1",
    reference: "UNDP-LBY-2024-017",
    title: "Rehabilitation of Primary Health Clinics",
    agency: "UNDP",
    amount: 480000,
    currency: "USD",
    owner: "Procurement Team",
    status: "in-progress",
    submissionDate: date(5),
    dueDate: date(14),
    createdAt: date(-15),
    attachments,
    description:
      "Civil works and supply of equipment for three clinics in Sabha and Benghazi."
  },
  {
    id: "tender-2",
    reference: "UNICEF-LBY-ITB-2024-221",
    title: "WASH Supplies Framework",
    agency: "UNICEF",
    amount: 275000,
    currency: "EUR",
    owner: "Procurement Team",
    status: "shared",
    submissionDate: date(12),
    dueDate: date(20),
    createdAt: date(-20),
    attachments,
    description: "Multi-lot procurement of hygiene kits and water trucking."
  },
  {
    id: "tender-3",
    reference: "IOM-LBY-RFP-2024-044",
    title: "Shelter Upgrades in Tripoli",
    agency: "IOM",
    amount: 610000,
    currency: "USD",
    owner: "Projects Team",
    status: "awarded",
    submissionDate: date(-35),
    dueDate: date(-28),
    createdAt: date(-70),
    attachments,
    description: "Design and build modular shelters for IDP sites."
  }
];

export const suppliers: Supplier[] = [
  {
    id: "supplier-1",
    name: "Libya Build Co.",
    category: "Construction",
    rating: 4.5,
    contact: "Fatima Al-Mansouri",
    email: "fatima@libyabuild.ly",
    phone: "+218-92-123-4567",
    country: "Libya"
  },
  {
    id: "supplier-2",
    name: "Desert Logistics",
    category: "Logistics",
    rating: 4.2,
    contact: "Hassan Idris",
    email: "hassan@desertlogistics.ly",
    phone: "+218-91-987-6543",
    country: "Libya"
  },
  {
    id: "supplier-3",
    name: "MedTech Solutions",
    category: "Medical",
    rating: 4.7,
    contact: "Rania El-Barassi",
    email: "rania@medtech.ly",
    phone: "+218-94-111-2233",
    country: "Turkey"
  }
];

export const invoices: Invoice[] = [
  {
    id: "inv-1",
    projectId: "project-1",
    number: "INV-2024-041",
    issueDate: date(-25),
    dueDate: date(10),
    amount: 125000,
    currency: "USD",
    status: "submitted"
  },
  {
    id: "inv-2",
    projectId: "project-1",
    number: "INV-2024-042",
    issueDate: date(-5),
    dueDate: date(25),
    amount: 92000,
    currency: "USD",
    status: "draft"
  },
  {
    id: "inv-3",
    projectId: "project-2",
    number: "INV-2024-055",
    issueDate: date(-45),
    dueDate: date(-5),
    amount: 185000,
    currency: "EUR",
    status: "overdue"
  }
];

export const projects: Project[] = [
  {
    id: "project-1",
    tenderId: "tender-3",
    name: "Tripoli Shelter Upgrades",
    manager: "Layla Ben Ali",
    budget: 610000,
    spent: 345000,
    received: 220000,
    profitLyd: 412000,
    status: "executing",
    startDate: date(-60),
    endDate: date(90),
    riskLevel: "medium",
    guarantee: {
      amount: 30000,
      start: date(-30),
      expiry: date(120),
      retained: 10000
    },
    timeline: [
      { label: "Kickoff", date: date(-55), status: "complete" },
      { label: "Design sign-off", date: date(-20), status: "complete" },
      { label: "Procurement", date: date(15), status: "in-progress" },
      { label: "Construction", date: date(60), status: "in-progress" },
      { label: "Handover", date: date(100), status: "blocked" }
    ],
    invoices: invoices.filter((invoice) => invoice.projectId === "project-1"),
    suppliers: [suppliers[0], suppliers[2]]
  },
  {
    id: "project-2",
    tenderId: "tender-1",
    name: "Clinic Rehabilitation Sabha",
    manager: "Omar Ghat",
    budget: 480000,
    spent: 185000,
    received: 125000,
    profitLyd: 218000,
    status: "planning",
    startDate: date(-15),
    endDate: date(120),
    riskLevel: "low",
    guarantee: {
      amount: 25000,
      start: date(-5),
      expiry: date(200),
      retained: 5000
    },
    timeline: [
      { label: "Mobilization", date: date(10), status: "in-progress" },
      { label: "Procurement", date: date(50), status: "blocked" },
      { label: "Works", date: date(120), status: "blocked" }
    ],
    invoices: invoices.filter((invoice) => invoice.projectId === "project-2"),
    suppliers: [suppliers[1]]
  }
];

export const notifications: Notification[] = [
  {
    id: "notif-1",
    type: "tender",
    message: "Submission due in 5 days for UNDP-LBY-2024-017",
    level: "warning",
    date: date(-1)
  },
  {
    id: "notif-2",
    type: "invoice",
    message: "Invoice INV-2024-055 is overdue",
    level: "danger",
    date: date(-2)
  },
  {
    id: "notif-3",
    type: "project",
    message: "Guarantee for Tripoli Shelter Upgrades expires in 90 days",
    level: "info",
    date: date(-3)
  }
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: "metric-1",
    label: "Active Tenders",
    value: "12",
    change: 8.4
  },
  {
    id: "metric-2",
    label: "Pipeline Value",
    value: "3.1M USD",
    change: 5.2
  },
  {
    id: "metric-3",
    label: "Projects At Risk",
    value: "2",
    change: -3.5
  }
];

export const pipelineBreakdown: PipelineBreakdown[] = [
  { stage: "Shared", value: 4 },
  { stage: "In preparation", value: 3 },
  { stage: "Submitted", value: 5 },
  { stage: "Awarded", value: 2 }
];

export const cashflow: CashflowPoint[] = [
  { month: "Jan", pipeline: 210000, invoices: 75000, expenses: 52000 },
  { month: "Feb", pipeline: 280000, invoices: 88000, expenses: 69000 },
  { month: "Mar", pipeline: 325000, invoices: 91000, expenses: 72000 },
  { month: "Apr", pipeline: 400000, invoices: 120000, expenses: 86000 },
  { month: "May", pipeline: 480000, invoices: 150000, expenses: 94000 },
  { month: "Jun", pipeline: 510000, invoices: 172000, expenses: 99000 }
];

export const users: User[] = [
  {
    id: "user-1",
    name: "Admin Team",
    email: "admin@company.ly",
    role: "admin",
    active: true
  },
  {
    id: "user-2",
    name: "Procurement Officer",
    email: "procurement@company.ly",
    role: "procurement",
    active: true
  },
  {
    id: "user-3",
    name: "Finance Officer",
    email: "finance@company.ly",
    role: "finance",
    active: true
  }
];
