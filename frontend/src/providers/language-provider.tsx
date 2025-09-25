import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { appConfig, type Locale } from "@/theme/tokens";

export type DictionaryKey =
  | "dashboard"
  | "tenders"
  | "projects"
  | "suppliers"
  | "finance"
  | "reports"
  | "admin"
  | "welcome"
  | "pipeline"
  | "notifications"
  | "viewAll"
  | "search"
  | "filters"
  | "exportCSV"
  | "noResults"
  | "loading"
  | "error"
  | "retry"
  | "attachments"
  | "addNew"
  | "save"
  | "cancel"
  | "name"
  | "reference"
  | "agency"
  | "quantity"
  | "unitCost"
  | "description"

  | "status"
  | "owner"
  | "dueDate"
  | "amount"
  | "tenderType"
  | "statusReason"
  | "offerValue"
  | "tags"
  | "siteVisit"
  | "siteVisitAssignee"
  | "siteVisitNotes"
  | "siteVisitPending"
  | "specificationBooks"
  | "specificationBookNumber"
  | "specificationBookCost"
  | "specificationBookMethod"
  | "specificationBookResponsible"
  | "specificationBookStatusPurchased"
  | "specificationBookStatusMissing"
  | "specificationBookReceipt"
  | "addSpecificationBook"
  | "proposals"
  | "technicalProposal"
  | "financialProposal"
  | "proposalsBlocked"
  | "updateProposals"
  | "timeline"
  | "actions"
  | "view"
  | "edit"
  | "files"
  | "pricing"
  | "pricingBasis"
  | "pricingBaseCost"
  | "pricingMargin"
  | "pricingShipping"
  | "pricingFinalPrice"
  | "supplierComparisons"
  | "reminders"
  | "submissionReminder"
  | "specPurchaseReminder"
  | "siteVisitReminder"
  | "guaranteeReminder"
  | "notAvailable"
  | "links"
  | "tagsPlaceholder"
  | "languageSwitch"
  | "commandPalettePlaceholder"
  | "presetSaved"
  | "presetRemoved"
  | "direction";

type Dictionary = Record<DictionaryKey, string>;

type LanguageContextValue = {
  locale: Locale;
  direction: "rtl" | "ltr";
  toggleLocale: () => void;
  t: (key: DictionaryKey) => string;
};

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    dashboard: "Dashboard",
    tenders: "Tenders",
    projects: "Projects",
    suppliers: "Suppliers",
    finance: "Finance",
    reports: "Reports",
    admin: "Admin",
    welcome: "Welcome back",
    pipeline: "Pipeline",
    notifications: "Alerts",
    viewAll: "View all",
    search: "Search...",
    filters: "Filters",
    exportCSV: "Export CSV",
    noResults: "No records match your filters.",
    loading: "Loading",
    error: "Something went wrong",
    retry: "Retry",
    attachments: "Attachments",
    addNew: "Add new",
    save: "Save",
    cancel: "Cancel",
    name: "Name",
    reference: "Reference",
    agency: "Agency",
    quantity: "Quantity",
    unitCost: "Unit cost",
    description: "Description",
    status: "Status",
    owner: "Assignee",
    dueDate: "Due date",
    amount: "Amount",
    tenderType: "Tender type",
    statusReason: "Status reason",
    notes: "Notes",

    offerValue: "Offer",
    tags: "Tags",
    siteVisit: "Site visit",
    siteVisitAssignee: "Assigned to",
    siteVisitNotes: "Visit notes",
    siteVisitPending: "Visit not scheduled",
    specificationBooks: "Specification booklets",
    specificationBookNumber: "Booklet number",
    specificationBookCost: "Booklet cost",
    specificationBookMethod: "Purchase method",
    specificationBookResponsible: "Responsible",
    specificationBookStatusPurchased: "Purchased",
    specificationBookStatusMissing: "Not purchased",
    specificationBookReceipt: "Receipt",
    addSpecificationBook: "Add booklet",
    proposals: "Proposals",
    technicalProposal: "Technical proposal URL",
    financialProposal: "Financial proposal URL",
    proposalsBlocked: "Purchase the specification booklet before submitting proposals.",
    updateProposals: "Save proposals",
    timeline: "Activity timeline",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    open: "Open",

    files: "Files",
    pricing: "Pricing",
    pricingBasis: "Shipping basis",
    pricingBaseCost: "Base cost",
    pricingMargin: "Margin",
    pricingShipping: "Shipping",
    pricingFinalPrice: "Final price",
    supplierComparisons: "Supplier comparisons",
    reminders: "Reminders",
    submissionReminder: "Submission",
    submissionDate: "Submission date",

    specPurchaseReminder: "Specification purchase",
    siteVisitReminder: "Site visit",
    guaranteeReminder: "Guarantee",
    notAvailable: "Not available",
    links: "Links",
    tagsPlaceholder: "e.g. construction, UNDP",
    languageSwitch: "العربية",
    commandPalettePlaceholder: "Search navigation, tenders, suppliers...",
    presetSaved: "Filter preset saved",
    presetRemoved: "Preset removed",
    direction: "ltr"
  },
  ar: {
    dashboard: "لوحة التحكم",
    tenders: "المناقصات",
    projects: "المشاريع",
    suppliers: "الموردون",
    finance: "المالية",
    reports: "التقارير",
    admin: "الإدارة",
    welcome: "مرحباً بعودتك",
    pipeline: "قائمة الفرص",
    notifications: "التنبيهات",
    viewAll: "عرض الكل",
    search: "بحث...",
    filters: "مرشحات",
    exportCSV: "تصدير CSV",
    noResults: "لا توجد سجلات مطابقة للمرشحات.",
    loading: "جاري التحميل",
    error: "حدث خطأ",
    retry: "إعادة المحاولة",
    attachments: "المرفقات",
    addNew: "إضافة",
    save: "حفظ",
    cancel: "إلغاء",
    name: "الاسم",
    reference: "الرقم المرجعي",
    agency: "الجهة المعلنة",
    quantity: "الكمية",
    unitCost: "سعر الوحدة",
    description: "الوصف",
    status: "الحالة",
    owner: "المكلّف",
    dueDate: "تاريخ الاستحقاق",
    amount: "المبلغ",
    tenderType: "نوع المناقصة",
    statusReason: "سبب الحالة",
    notes: "ملاحظات",
    offerValue: "قيمة العرض",
    tags: "الوسوم",
    siteVisit: "الزيارة الميدانية",
    siteVisitAssignee: "المكلّف بالزيارة",
    siteVisitNotes: "ملاحظات الزيارة",
    siteVisitPending: "لم يتم تحديد موعد للزيارة",
    specificationBooks: "كراسات المواصفات",
    specificationBookNumber: "رقم الكراسة",
    specificationBookCost: "تكلفة الكراسة",
    specificationBookMethod: "طريقة الشراء",
    specificationBookResponsible: "المسؤول",
    specificationBookStatusPurchased: "تم الشراء",
    specificationBookStatusMissing: "غير مشتراة",
    specificationBookReceipt: "الإيصال",
    addSpecificationBook: "إضافة كراسة",
    proposals: "العروض",
    technicalProposal: "رابط العرض الفني",
    financialProposal: "رابط العرض المالي",
    proposalsBlocked: "يجب شراء كراسة المواصفات قبل رفع العروض.",
    updateProposals: "حفظ بيانات العروض",
    timeline: "سجل النشاط",
    actions: "إجراءات",
    view: "عرض",
    edit: "تعديل",
    open: "فتح",
    files: "مرفقات",
    pricing: "التسعير",
    pricingBasis: "أساس الشحن",
    pricingBaseCost: "التكلفة الأساسية",
    pricingMargin: "الهامش",
    pricingShipping: "الشحن",
    pricingFinalPrice: "السعر النهائي",
    supplierComparisons: "مقارنات الموردين",
    reminders: "التنبيهات",
    submissionReminder: "تسليم العرض",
    submissionDate: "تاريخ التقديم",
    specPurchaseReminder: "شراء الكراسة",
    siteVisitReminder: "الزيارة الميدانية",
    guaranteeReminder: "الضمان",
    notAvailable: "غير متوفر",
    links: "الروابط",
    tagsPlaceholder: "مثال: إنشاءات، الأمم المتحدة",
    languageSwitch: "English",
    commandPalettePlaceholder: "ابحث في الصفحات والمناقصات...",
    presetSaved: "تم حفظ المرشح",
    presetRemoved: "تم حذف المرشح",
    direction: "rtl"
  }
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const localeStorageKey = "tender-portal-locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = window.localStorage.getItem(localeStorageKey);
    if (stored && appConfig.locales.includes(stored as Locale)) {
      return stored as Locale;
    }
    return appConfig.defaultLocale;
  });

  const direction = useMemo<"rtl" | "ltr">(
    () => (appConfig.rtlLocales.has(locale) ? "rtl" : "ltr"),
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    window.localStorage.setItem(localeStorageKey, locale);
  }, [direction, locale]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const value = useMemo(
    () => ({
      locale,
      direction,
      toggleLocale,
      t: (key: DictionaryKey) => dictionaries[locale][key]
    }),
    [direction, locale, toggleLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div dir={direction}>{children}</div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
