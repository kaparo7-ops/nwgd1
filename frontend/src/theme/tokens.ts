export const colorTokens = {
  primary: "#0057B8",
  secondary: "#00A19A",
  accent: "#F27F0C",
  success: "#38A169",
  warning: "#F6AD55",
  danger: "#E53E3E",
  neutral: "#F5F7FA"
} as const;

export const typographyTokens = {
  title: "text-3xl font-bold tracking-tight",
  subtitle: "text-lg font-medium text-slate-600",
  body: "text-base leading-relaxed",
  caption: "text-sm text-slate-500"
} as const;

export const spacingTokens = {
  page: "py-8 px-6",
  section: "space-y-6",
  card: "p-6"
} as const;

export const radiusTokens = {
  soft: "rounded-2xl",
  pill: "rounded-full"
} as const;

export const shadowTokens = {
  soft: "shadow-soft",
  outline: "shadow-outline"
} as const;

export const appConfig = {
  locales: ["en", "ar"] as const,
  defaultLocale: "en" as const,
  rtlLocales: new Set(["ar"])
};

export type Locale = (typeof appConfig.locales)[number];
