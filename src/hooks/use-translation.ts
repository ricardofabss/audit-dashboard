"use client";

import { useAuditStore } from "./use-audit-store";
import { translations, type TranslationKey } from "@/lib/translations";

export function useTranslation() {
  const { language, setLanguage } = useAuditStore();

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || String(key);
  };

  return { t, language, setLanguage };
}
