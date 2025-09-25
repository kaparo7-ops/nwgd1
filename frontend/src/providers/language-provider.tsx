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
  | "status"
  | "owner"
  | "dueDate"
  | "amount"
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
    status: "Status",
    owner: "Owner",
    dueDate: "Due date",
    amount: "Amount",
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
    status: "الحالة",
    owner: "المسؤول",
    dueDate: "تاريخ الاستحقاق",
    amount: "المبلغ",
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
