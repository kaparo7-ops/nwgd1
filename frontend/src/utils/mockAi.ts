import type {
  Attachment,
  Tender,
  TenderAiComparison,
  TenderAiInsights,
  TenderAiRequirement,
  TenderAiRiskAssessment,
  TenderAiSummary
} from "@/utils/types";
import { prefixedRandomId } from "@/utils/random";

export type TenderAiContext = {
  id: string;
  title: string;
  reference: string;
  owner: string;
  agency: string;
  amount: number;
  currency: string;
  dueDate: string;
  submissionDate: string;
  attachments: Attachment[];
  tags: string[];
};

const isoNow = () => new Date().toISOString();

const randomConfidence = () =>
  Math.round((0.75 + Math.random() * 0.2) * 100) / 100;

const safeIsoDate = (value?: string) => {
  if (!value) return "TBC";
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch (error) {
    return value;
  }
};

const attachmentName = (attachments: Attachment[], index: number, fallback: string) =>
  attachments[index]?.fileName ?? fallback;

const attachmentId = (attachments: Attachment[], index: number) => attachments[index]?.id;

const formatAmount = (amount?: number, currency?: string) => {
  if (typeof amount !== "number") return "";
  const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${currency ?? "USD"} ${formatted}`;
};

export const extractAiContext = (tender: Tender): TenderAiContext => ({
  id: tender.id,
  title: tender.title,
  reference: tender.reference,
  owner: tender.owner,
  agency: tender.agency,
  amount: tender.amount,
  currency: tender.currency,
  dueDate: tender.dueDate,
  submissionDate: tender.submissionDate,
  attachments: tender.attachments,
  tags: tender.tags
});

export const createMockAiSummary = (
  context: Partial<TenderAiContext>,
  timestamp: string = isoNow()
): TenderAiSummary => {
  const attachments = context.attachments ?? [];
  const documentLabel = attachmentName(attachments, 0, "tender documents");
  const secondaryLabel = attachmentName(attachments, 1, documentLabel);
  const dueDate = safeIsoDate(context.dueDate);
  const submissionDate = safeIsoDate(context.submissionDate);
  const owner = context.owner || "procurement team";
  const valueDisplay = formatAmount(context.amount, context.currency);

  const highlights = [
    `${attachments.length || "No"} ${attachments.length === 1 ? "attachment" : "attachments"} reviewed`,
    `Submission target ${submissionDate}`,
    valueDisplay ? `Estimated value ${valueDisplay}` : `Agency ${context.agency ?? "N/A"}`
  ];

  const actionItems = [
    `Coordinate with ${owner} to finalise outstanding clarifications before ${dueDate}.`,
    `Validate quantities captured in ${secondaryLabel}.`,
    `Ensure compliance matrix references ${documentLabel}.`
  ];

  return {
    overview:
      context.title
        ? `Automated synopsis of “${context.title}” referencing uploaded documentation such as ${documentLabel}.`
        : `Automated synopsis referencing uploaded documentation such as ${documentLabel}.`,
    highlights,
    actionItems,
    updatedAt: timestamp
  };
};

export const createMockAiRequirements = (
  context: Partial<TenderAiContext>,
  timestamp: string = isoNow()
): TenderAiRequirement[] => {
  const attachments = context.attachments ?? [];
  const torId = attachmentId(attachments, 0);
  const boqId = attachmentId(attachments, 1);
  const photosId = attachmentId(attachments, 2);

  const requirements: TenderAiRequirement[] = [
    {
      id: prefixedRandomId("ai-req"),
      title: "Technical scope confirmed",
      detail: `Scope captured in ${attachmentName(attachments, 0, "the TOR")} aligns with the stated objectives.`,
      status: attachments.length > 0 ? "met" : "missing",
      priority: "high",
      references: torId ? [torId] : [],
      updatedAt: timestamp
    },
    {
      id: prefixedRandomId("ai-req"),
      title: "Bill of quantities cross-check",
      detail: `Quantities in ${attachmentName(attachments, 1, "the BoQ")} should match the site assessment records.`,
      status: attachments.length > 1 ? "in-progress" : "missing",
      priority: "medium",
      references: boqId ? [boqId] : [],
      updatedAt: timestamp
    },
    {
      id: prefixedRandomId("ai-req"),
      title: "Site evidence attached",
      detail: `Photographic evidence in ${attachmentName(attachments, 2, "the site photos archive")} supports field verification.`,
      status: attachments.length > 2 ? "met" : "in-progress",
      priority: "low",
      references: photosId ? [photosId] : [],
      updatedAt: timestamp
    }
  ];

  return requirements;
};

export const createMockAiComparisons = (
  context: Partial<TenderAiContext>,
  timestamp: string = isoNow()
): TenderAiComparison[] => {
  const attachments = context.attachments ?? [];
  const comparisons: TenderAiComparison[] = [
    {
      id: prefixedRandomId("ai-cmp"),
      topic: "Specification completeness",
      winner: attachmentName(attachments, 0, "primary TOR"),
      rationale: `Primary specification document provides the clearest articulation of the scope for ${context.agency ?? "the agency"}.`,
      confidence: randomConfidence(),
      updatedAt: timestamp
    },
    {
      id: prefixedRandomId("ai-cmp"),
      topic: "Pricing transparency",
      winner: attachmentName(attachments, 1, "pricing annex"),
      rationale: `Detailed unit rates in ${attachmentName(attachments, 1, "the BoQ")} support internal cost build-up and variance analysis.`,
      confidence: randomConfidence(),
      updatedAt: timestamp
    }
  ];

  return comparisons;
};

export const createMockAiRisks = (
  context: Partial<TenderAiContext>,
  timestamp: string = isoNow()
): TenderAiRiskAssessment[] => {
  const attachments = context.attachments ?? [];
  const risks: TenderAiRiskAssessment[] = [
    {
      id: prefixedRandomId("ai-risk"),
      title: "Clarification dependency",
      level: attachments.length > 0 ? "medium" : "high",
      impact: "Pending clarifications could delay pricing sign-off or submission readiness.",
      mitigation: `Prepare clarification log based on ${attachmentName(attachments, 0, "available documents")} and share with stakeholders early.`,
      updatedAt: timestamp
    },
    {
      id: prefixedRandomId("ai-risk"),
      title: "Site conditions",
      level: attachments.length > 2 ? "low" : "medium",
      impact: "Incomplete understanding of site realities may inflate contingency requirements.",
      mitigation: `Capture outstanding visuals and compare against ${attachmentName(attachments, 2, "existing photos")} before final pricing.`,
      updatedAt: timestamp
    }
  ];

  return risks;
};

export const createMockAiInsights = (context: Partial<TenderAiContext>): TenderAiInsights => {
  const timestamp = isoNow();
  return {
    summary: createMockAiSummary(context, timestamp),
    requirements: createMockAiRequirements(context, timestamp),
    comparisons: createMockAiComparisons(context, timestamp),
    risks: createMockAiRisks(context, timestamp),
    lastAnalyzedAt: timestamp
  };
};
