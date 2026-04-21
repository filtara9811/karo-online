import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "ur" | "gu" | "mr";
export type Theme = "light" | "dark";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    my_account: "My Account",
    personal_details: "Personal Details",
    full_name: "Full Name",
    contact: "Contact",
    email: "Email",
    address: "Address",
    member_code: "Member Code",
    profile: "Profile",
    details: "Details",
    kyc: "KYC",
    bank: "Bank",
    business: "Business",
    account: "Account",
    logout: "Logout",
    customer_support: "Customer Support",
    theme: "Theme",
    language: "Language",
    select_language: "Select Language",
    raise_ticket: "Raise a Ticket",
    call_us: "Call Us",
    email_us: "Email Us",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    refund: "Refund",
    cancel: "Cancel",
    save: "Save",
  },
  hi: {
    my_account: "मेरा अकाउंट",
    personal_details: "व्यक्तिगत विवरण",
    full_name: "पूरा नाम",
    contact: "संपर्क",
    email: "ईमेल",
    address: "पता",
    member_code: "सदस्य कोड",
    profile: "प्रोफ़ाइल",
    details: "विवरण",
    kyc: "केवाईसी",
    bank: "बैंक",
    business: "व्यापार",
    account: "अकाउंट",
    logout: "लॉगआउट",
    customer_support: "ग्राहक सहायता",
    theme: "थीम",
    language: "भाषा",
    select_language: "भाषा चुनें",
    raise_ticket: "टिकट बनाएँ",
    call_us: "कॉल करें",
    email_us: "ईमेल करें",
    terms: "नियम व शर्तें",
    privacy: "गोपनीयता नीति",
    refund: "रिफंड",
    cancel: "रद्द करें",
    save: "सहेजें",
  },
  ur: {
    my_account: "میرا اکاؤنٹ",
    personal_details: "ذاتی تفصیلات",
    full_name: "پورا نام",
    contact: "رابطہ",
    email: "ای میل",
    address: "پتہ",
    member_code: "ممبر کوڈ",
    profile: "پروفائل",
    details: "تفصیلات",
    kyc: "کے وائی سی",
    bank: "بینک",
    business: "کاروبار",
    account: "اکاؤنٹ",
    logout: "لاگ آؤٹ",
    customer_support: "کسٹمر سپورٹ",
    theme: "تھیم",
    language: "زبان",
    select_language: "زبان منتخب کریں",
    raise_ticket: "ٹکٹ بنائیں",
    call_us: "کال کریں",
    email_us: "ای میل کریں",
    terms: "شرائط و ضوابط",
    privacy: "رازداری کی پالیسی",
    refund: "رقم کی واپسی",
    cancel: "منسوخ کریں",
    save: "محفوظ کریں",
  },
  gu: {
    my_account: "મારું ખાતું",
    personal_details: "વ્યક્તિગત વિગતો",
    full_name: "પૂરું નામ",
    contact: "સંપર્ક",
    email: "ઇમેઇલ",
    address: "સરનામું",
    member_code: "સભ્ય કોડ",
    profile: "પ્રોફાઇલ",
    details: "વિગતો",
    kyc: "કેવાયસી",
    bank: "બેંક",
    business: "વ્યવસાય",
    account: "ખાતું",
    logout: "લોગઆઉટ",
    customer_support: "ગ્રાહક સહાય",
    theme: "થીમ",
    language: "ભાષા",
    select_language: "ભાષા પસંદ કરો",
    raise_ticket: "ટિકિટ બનાવો",
    call_us: "કૉલ કરો",
    email_us: "ઇમેઇલ કરો",
    terms: "નિયમો અને શરતો",
    privacy: "ગોપનીયતા નીતિ",
    refund: "રિફંડ",
    cancel: "રદ કરો",
    save: "સાચવો",
  },
  mr: {
    my_account: "माझे खाते",
    personal_details: "वैयक्तिक तपशील",
    full_name: "पूर्ण नाव",
    contact: "संपर्क",
    email: "ईमेल",
    address: "पत्ता",
    member_code: "सदस्य कोड",
    profile: "प्रोफाइल",
    details: "तपशील",
    kyc: "केवायसी",
    bank: "बँक",
    business: "व्यवसाय",
    account: "खाते",
    logout: "लॉगआउट",
    customer_support: "ग्राहक सहाय्य",
    theme: "थीम",
    language: "भाषा",
    select_language: "भाषा निवडा",
    raise_ticket: "तिकीट तयार करा",
    call_us: "कॉल करा",
    email_us: "ईमेल करा",
    terms: "नियम व अटी",
    privacy: "गोपनीयता धोरण",
    refund: "परतावा",
    cancel: "रद्द करा",
    save: "जतन करा",
  },
};

export const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", label: "Urdu", native: "اردو", flag: "🇵🇰" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", native: "मराठी", flag: "🇮🇳" },
];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
};

const AppPrefsCtx = createContext<Ctx | null>(null);

export function AppPrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const l = (localStorage.getItem("ko-lang") as Lang) || "en";
    const th = (localStorage.getItem("ko-theme") as Theme) || "light";
    setLangState(l);
    setTheme(th);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [lang, theme]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("ko-lang", l);
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined") localStorage.setItem("ko-theme", next);
  };

  const t = (key: string) => DICT[lang]?.[key] ?? DICT.en[key] ?? key;

  return (
    <AppPrefsCtx.Provider value={{ lang, setLang, theme, toggleTheme, t }}>
      {children}
    </AppPrefsCtx.Provider>
  );
}

export function useAppPrefs() {
  const ctx = useContext(AppPrefsCtx);
  if (!ctx) {
    // Safe fallback so components don't crash if provider missing
    return {
      lang: "en" as Lang,
      setLang: () => {},
      theme: "light" as Theme,
      toggleTheme: () => {},
      t: (k: string) => DICT.en[k] ?? k,
    };
  }
  return ctx;
}
