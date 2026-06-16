import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

const STORAGE_KEY = "vk-ads-ui-language";

function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistLanguage(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* ignore storage errors */
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: getStoredLanguage() ?? "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
