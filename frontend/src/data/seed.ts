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
  TenderPricingLine,

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
  },
  {
    id: "att-3",
    fileName: "Site_Visit_Photos.zip",
    fileSize: 6892340,
    uploadedAt: date(-6),
    uploader: "Salem Haddad",
    previewUrl: undefined
  }
];

const specificationReceipts: SpecificationBook["attachment"][] = [
  {
    id: "att-spec-1",
    fileName: "Receipt-UNDP-017.pdf",
    fileSize: 325600,
    uploadedAt: date(-13),
    uploader: "Finance Officer",
    previewUrl: "https://dummyimage.com/600x400/1f2937/ffffff&text=Receipt"
  },
  {
    id: "att-spec-2",
    fileName: "Receipt-UNICEF-221.pdf",
    fileSize: 285400,
    uploadedAt: date(-18),
    uploader: "Finance Officer",
    previewUrl: "https://dummyimage.com/600x400/0369a1/ffffff&text=Receipt"
  }
];

const tenderActivities = (
  entries: Array<Pick<TenderActivity, "id" | "date" | "actor" | "description" | "category">>
): TenderActivity[] => entries;

const pricingLine = (
  id: string,
  item: string,
  unitCost: number,
  quantity: number,
  margin: number,
  shipping: number,
  currency: string,
  supplier?: string
): TenderPricingLine => ({
  id,
  item,
  unitCost,
  quantity,
  margin,
  shipping,
  currency,
  supplier,
  total: Math.round(unitCost * quantity * (1 + margin / 100) + shipping)
});


export const tenders: Tender[] = [
  {
    id: "tender-1",
    reference: "UNDP-LBY-2024-017",
    title: "Rehabilitation of Primary Health Clinics",
    tenderType: "ITB",

    agency: "UNDP",
    amount: 480000,
    currency: "USD",
    owner: "Procurement Team",
    status: "submitted",
    statusReason: undefined,
    tags: ["Health", "Construction", "Infrastructure"],
    submissionDate: date(-1),
    dueDate: date(7),
    createdAt: date(-30),
    siteVisit: {
      date: date(-10),
      assignee: "Salem Haddad",
      notes: "Site visit completed with municipality engineer. Photos archived.",
      completed: true
    },
    specificationBooks: [
      {
        id: "book-1",
        number: "ITB-2024-017",
        purchaseDate: date(-18),
        cost: 250,
        currency: "USD",
        purchaseMethod: "Bank transfer",
        responsible: "Amina Al-Senussi",
        attachment: specificationReceipts[0]
      }
    ],
    proposals: {
      technicalUrl: "https://example.org/docs/tender-1-technical.pdf",
      financialUrl: "https://example.org/docs/tender-1-financial.xlsx",
      submittedBy: "Amina Al-Senussi",
      submittedAt: date(-1)
    },
    attachments,
    links: [
      {
        id: "link-1",
        label: "Tender notice",
        url: "https://procurement-notices.undp.org/view_notice.cfm?notice_id=123456",
        type: "general"
      },
      {
        id: "link-2",
        label: "Clarification log",
        url: "https://example.org/docs/tender-1-clarifications.pdf",
        type: "general"
      }
    ],
    timeline: tenderActivities([
      {
        id: "tender-1-activity-1",
        date: date(-30),
        actor: "Amina Al-Senussi",
        description: "Tender registered in the pipeline",
        category: "status"
      },
      {
        id: "tender-1-activity-2",
        date: date(-18),
        actor: "Finance Officer",
        description: "Specification booklet purchased (ITB-2024-017)",
        category: "update"
      },
      {
        id: "tender-1-activity-3",
        date: date(-10),
        actor: "Salem Haddad",
        description: "Site visit completed and documented",
        category: "update"
      },
      {
        id: "tender-1-activity-4",
        date: date(-1),
        actor: "Amina Al-Senussi",
        description: "Technical and financial proposals submitted",
        category: "status"
      }
    ]),
    pricing: {
      basis: "cbm",
      lines: [
        pricingLine("tender-1-line-1", "Civil works package", 18000, 12, 12, 750, "USD", "Libya Build Co."),
        pricingLine("tender-1-line-2", "Medical equipment supply", 22000, 8, 10, 500, "USD", "MedTech Solutions")
      ],
      summary: {
        baseCost: 392000,
        marginValue: 43520,
        shippingCost: 1250,
        finalPrice: 436770,
        currency: "USD"
      }
    },
    supplierComparisons: [
      {
        item: "Solar water heaters",
        suppliers: [
          { name: "Desert Logistics", unitCost: 5200, currency: "USD" },
          { name: "Libya Build Co.", unitCost: 5100, currency: "USD" },
          { name: "MedTech Solutions", unitCost: 5400, currency: "USD" }
        ],
        preferred: "Libya Build Co."
      }
    ],
    alerts: {
      submissionReminderAt: date(3),
      needsSpecificationPurchase: false,
      siteVisitOverdue: false,
      guaranteeAlert: date(120)
    },

    description:
      "Civil works and supply of equipment for three clinics in Sabha and Benghazi."
  },
  {
    id: "tender-2",
    reference: "UNICEF-LBY-ITB-2024-221",
    title: "WASH Supplies Framework",
    tenderType: "ITB",

    agency: "UNICEF",
    amount: 275000,
    currency: "EUR",
    owner: "Procurement Team",
    status: "preparing",
    statusReason: undefined,
    tags: ["WASH", "Framework", "Supply"],
    submissionDate: date(20),
    dueDate: date(20),
    createdAt: date(-21),
    siteVisit: {
      date: date(5),
      assignee: "Omar Ghat",
      notes: "Awaiting security clearance to confirm visit schedule.",
      completed: false
    },
    specificationBooks: [
      {
        id: "book-2",
        number: "ITB-2024-221",
        purchaseDate: null,
        cost: 0,
        currency: "EUR",
        purchaseMethod: "Pending",
        responsible: "Procurement Team",
        attachment: null
      }
    ],
    proposals: {
      technicalUrl: undefined,
      financialUrl: undefined,
      submittedBy: undefined,
      submittedAt: undefined
    },
    attachments: attachments.slice(0, 2),
    links: [
      {
        id: "link-3",
        label: "UNICEF tender portal",
        url: "https://www.unicef.org/supply/procurement",
        type: "general"
      }
    ],
    timeline: tenderActivities([
      {
        id: "tender-2-activity-1",
        date: date(-21),
        actor: "Procurement Team",
        description: "Opportunity shared with internal stakeholders",
        category: "status"
      },
      {
        id: "tender-2-activity-2",
        date: date(-5),
        actor: "Automation",
        description: "Reminder: specification booklet not purchased yet",
        category: "reminder"
      }
    ]),
    pricing: {
      basis: "weight",
      lines: [
        pricingLine("tender-2-line-1", "Hygiene kit assembly", 85, 1500, 18, 0, "EUR", "Desert Logistics")
      ],
      summary: {
        baseCost: 127500,
        marginValue: 22950,
        shippingCost: 6400,
        finalPrice: 156850,
        currency: "EUR"
      }
    },
    supplierComparisons: [
      {
        item: "Water trucking",
        suppliers: [
          { name: "Desert Logistics", unitCost: 120, currency: "EUR" },
          { name: "Libya Build Co.", unitCost: 140, currency: "EUR" }
        ]
      }
    ],
    alerts: {
      submissionReminderAt: date(12),
      needsSpecificationPurchase: true,
      siteVisitOverdue: false,
      guaranteeAlert: null
    },

  },
  {
    id: "tender-3",
    reference: "IOM-LBY-RFP-2024-044",
    title: "Shelter Upgrades in Tripoli",
    tenderType: "RFP",

    agency: "IOM",
    amount: 610000,
    currency: "USD",
    owner: "Projects Team",
    status: "won",
    statusReason: "Preferred partner selected due to technical score advantage.",
    tags: ["Shelter", "Tripoli", "Construction"],
    submissionDate: date(-45),
    dueDate: date(-28),
    createdAt: date(-90),
    siteVisit: {
      date: date(-60),
      assignee: "Layla Ben Ali",
      notes: "Joint inspection with IOM engineer. Guarantee renewal flagged for finance.",
      completed: true
    },
    specificationBooks: [
      {
        id: "book-3",
        number: "RFP-2024-044",
        purchaseDate: date(-80),
        cost: 300,
        currency: "USD",
        purchaseMethod: "Online portal",
        responsible: "Layla Ben Ali",
        attachment: specificationReceipts[1]
      },
      {
        id: "book-4",
        number: "RFP-2024-044-LOT2",
        purchaseDate: date(-78),
        cost: 180,
        currency: "USD",
        purchaseMethod: "Online portal",
        responsible: "Layla Ben Ali",
        attachment: null
      }
    ],
    proposals: {
      technicalUrl: "https://example.org/docs/tender-3-technical.pdf",
      financialUrl: "https://example.org/docs/tender-3-financial.xlsx",
      submittedBy: "Layla Ben Ali",
      submittedAt: date(-40)
    },
    attachments: attachments.slice(0, 2),
    links: [
      {
        id: "link-4",
        label: "Award letter",
        url: "https://example.org/docs/tender-3-award.pdf",
        type: "general"
      }
    ],
    timeline: tenderActivities([
      {
        id: "tender-3-activity-1",
        date: date(-90),
        actor: "Projects Team",
        description: "Tender captured from IOM procurement portal",
        category: "status"
      },
      {
        id: "tender-3-activity-2",
        date: date(-80),
        actor: "Finance Officer",
        description: "Specification book purchased (primary lot)",
        category: "update"
      },
      {
        id: "tender-3-activity-3",
        date: date(-78),
        actor: "Finance Officer",
        description: "Additional lot booklet purchased",
        category: "update"
      },
      {
        id: "tender-3-activity-4",
        date: date(-45),
        actor: "Layla Ben Ali",
        description: "Proposal submitted to IOM",
        category: "status"
      },
      {
        id: "tender-3-activity-5",
        date: date(-28),
        actor: "IOM",
        description: "Clarification round closed",
        category: "note"
      },
      {
        id: "tender-3-activity-6",
        date: date(-20),
        actor: "IOM",
        description: "Notice of award received",
        category: "status"
      }
    ]),
    pricing: {
      basis: "flat",
      lines: [
        pricingLine("tender-3-line-1", "Modular shelter fabrication", 30500, 10, 14, 0, "USD", "Libya Build Co."),
        pricingLine("tender-3-line-2", "Installation crew", 8500, 6, 8, 0, "USD", "Libya Build Co."),
        pricingLine("tender-3-line-3", "Logistics and transport", 6400, 6, 6, 1200, "USD", "Desert Logistics")
      ],
      summary: {
        baseCost: 339000,
        marginValue: 40200,
        shippingCost: 7200,
        finalPrice: 386400,
        currency: "USD"
      }
    },
    supplierComparisons: [
      {
        item: "Steel structure suppliers",
        suppliers: [
          { name: "Libya Build Co.", unitCost: 30200, currency: "USD" },
          { name: "MedTech Solutions", unitCost: 33000, currency: "USD" }
        ],
        preferred: "Libya Build Co."
      }
    ],
    alerts: {
      submissionReminderAt: null,
      needsSpecificationPurchase: false,
      siteVisitOverdue: false,
      guaranteeAlert: date(45)
    },

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
