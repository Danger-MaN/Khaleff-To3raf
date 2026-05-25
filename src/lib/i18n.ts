import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGS = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "zh", label: "中文", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "he", label: "עברית", dir: "rtl" },
  { code: "nl", label: "Nederlands", dir: "ltr" },
  { code: "sv", label: "Svenska", dir: "ltr" },
  { code: "pl", label: "Polski", dir: "ltr" },
  { code: "id", label: "Indonesia", dir: "ltr" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" },
  { code: "th", label: "ไทย", dir: "ltr" },
  { code: "el", label: "Ελληνικά", dir: "ltr" },
  { code: "cs", label: "Čeština", dir: "ltr" },
  { code: "da", label: "Dansk", dir: "ltr" },
  { code: "fi", label: "Suomi", dir: "ltr" },
  { code: "no", label: "Norsk", dir: "ltr" },
  { code: "ro", label: "Română", dir: "ltr" },
  { code: "hu", label: "Magyar", dir: "ltr" },
  { code: "uk", label: "Українська", dir: "ltr" },
  { code: "ms", label: "Melayu", dir: "ltr" },
  { code: "bn", label: "বাংলা", dir: "ltr" },
  { code: "ta", label: "தமிழ்", dir: "ltr" },
  { code: "sw", label: "Kiswahili", dir: "ltr" },
  { code: "ca", label: "Català", dir: "ltr" },
  { code: "sk", label: "Slovenčina", dir: "ltr" },
  { code: "bg", label: "Български", dir: "ltr" },
  { code: "hr", label: "Hrvatski", dir: "ltr" },
  { code: "sr", label: "Српски", dir: "ltr" },
  { code: "sl", label: "Slovenščina", dir: "ltr" },
  { code: "lt", label: "Lietuvių", dir: "ltr" },
  { code: "lv", label: "Latviešu", dir: "ltr" },
  { code: "et", label: "Eesti", dir: "ltr" },
  { code: "az", label: "Azərbaycan", dir: "ltr" },
  { code: "fil", label: "Filipino", dir: "ltr" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

const resources = {
  ar: {
    translation: {
      brand: "خالف تُعرف",
      slogan: "حيث تُكسر اليقينيات وتُولد الأسئلة",
      tagline: "فكر • علم • ثقافة",
      nav: { home: "الرئيسية", articles: "المقالات", admin: "لوحة التحكم" },
      hero: { cta_read: "ابدأ القراءة", cta_about: "عن المنصة", eyebrow: "منصّة فكرية ضد المألوف" },
      filters: { all: "الكل", search: "ابحث في المقالات..." },
      article: {
        read_more: "اقرأ المقال",
        translating: "...جارٍ الترجمة",
        translated_notice: "تُرجم آليًا إلى لغتك",
        back: "← العودة",
        no_articles: "لا توجد مقالات منشورة بعد.",
      },
      theme: { label: "السمة", cyber: "معبد الكوني", papyrus: "البردي العتيق", marble: "الرخام الكلاسيكي" },
      lang: { label: "اللغة" },
      admin: {
        title: "لوحة التحكم", login: "تسجيل الدخول", password: "كلمة المرور",
        wrong_password: "كلمة المرور غير صحيحة", logout: "خروج",
        new_article: "مقال جديد", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء",
        confirm_delete: "هل أنت متأكد من الحذف؟",
        fields: {
          title: "العنوان", slug: "المعرّف (slug)", category: "التصنيف",
          excerpt: "المقتطف", content: "المحتوى الكامل",
          media: "رابط الوسائط (صورة / فيديو / YouTube)",
          translations: "ترجمات يدوية (اختيارية)", lang: "اللغة",
        },
        no_articles: "لا مقالات بعد. ابدأ بإنشاء واحد.",
      },
      categories: { philosophy: "فلسفة", science: "علم تجريبي", sexuality: "ثقافة جنسية", general: "عام" },
      footer: "© خالف تُعرف — حيث الفكر لا يستأذن.",
    },
  },
  en: {
    translation: {
      brand: "Khaleff To3raf",
      slogan: "Where certainties shatter and questions are born",
      tagline: "Philosophy • Science • Culture",
      nav: { home: "Home", articles: "Articles", admin: "Admin" },
      hero: { cta_read: "Start Reading", cta_about: "About", eyebrow: "An intellectual platform against the norm" },
      filters: { all: "All", search: "Search articles..." },
      article: {
        read_more: "Read article",
        translating: "Translating...",
        translated_notice: "Auto-translated to your language",
        back: "← Back",
        no_articles: "No articles published yet.",
      },
      theme: { label: "Theme", cyber: "Cyber Temple", papyrus: "Ancient Papyrus", marble: "Classic Marble" },
      lang: { label: "Language" },
      admin: {
        title: "Admin Dashboard", login: "Sign in", password: "Password",
        wrong_password: "Incorrect password", logout: "Logout",
        new_article: "New article", edit: "Edit", delete: "Delete",
        save: "Save", cancel: "Cancel", confirm_delete: "Delete this article?",
        fields: {
          title: "Title", slug: "Slug", category: "Category",
          excerpt: "Excerpt", content: "Full content",
          media: "Featured Media URL (image / video / YouTube)",
          translations: "Manual translations (optional)", lang: "Language",
        },
        no_articles: "No articles yet. Create one.",
      },
      categories: { philosophy: "Philosophy", science: "Experimental Science", sexuality: "Sexual Culture", general: "General" },
      footer: "© Khaleff To'raf — Where thought asks no permission.",
    },
  },
  fr: {
    translation: {
      brand: "Khaleff To3raf", slogan: "Là où les certitudes se brisent et les questions naissent",
      tagline: "Philosophie • Science • Culture",
      nav: { home: "Accueil", articles: "Articles", admin: "Admin" },
      hero: { cta_read: "Commencer à lire", cta_about: "À propos", eyebrow: "Une plateforme intellectuelle contre le conformisme" },
      filters: { all: "Tous", search: "Rechercher..." },
      article: { read_more: "Lire l'article", translating: "Traduction...", translated_notice: "Traduit automatiquement", back: "← Retour", no_articles: "Aucun article publié." },
      theme: { label: "Thème", cyber: "Temple Cyber", papyrus: "Papyrus Antique", marble: "Marbre Classique" },
      lang: { label: "Langue" },
      admin: { title: "Tableau de bord", login: "Connexion", password: "Mot de passe", wrong_password: "Mot de passe incorrect", logout: "Déconnexion", new_article: "Nouvel article", edit: "Modifier", delete: "Supprimer", save: "Enregistrer", cancel: "Annuler", confirm_delete: "Supprimer cet article?", fields: { title: "Titre", slug: "Slug", category: "Catégorie", excerpt: "Extrait", content: "Contenu", media: "URL média", translations: "Traductions manuelles", lang: "Langue" }, no_articles: "Aucun article." },
      categories: { philosophy: "Philosophie", science: "Science expérimentale", sexuality: "Culture sexuelle", general: "Général" },
      footer: "© Khaleff To'raf",
    },
  },
  es: {
    translation: {
      brand: "Khaleff To3raf", slogan: "Donde las certezas se rompen y nacen las preguntas",
      tagline: "Filosofía • Ciencia • Cultura",
      nav: { home: "Inicio", articles: "Artículos", admin: "Admin" },
      hero: { cta_read: "Empezar a leer", cta_about: "Acerca", eyebrow: "Una plataforma intelectual contra lo convencional" },
      filters: { all: "Todos", search: "Buscar..." },
      article: { read_more: "Leer", translating: "Traduciendo...", translated_notice: "Traducido automáticamente", back: "← Volver", no_articles: "Sin artículos." },
      theme: { label: "Tema", cyber: "Templo Cibernético", papyrus: "Papiro Antiguo", marble: "Mármol Clásico" },
      lang: { label: "Idioma" },
      admin: { title: "Panel", login: "Entrar", password: "Contraseña", wrong_password: "Contraseña incorrecta", logout: "Salir", new_article: "Nuevo artículo", edit: "Editar", delete: "Eliminar", save: "Guardar", cancel: "Cancelar", confirm_delete: "¿Eliminar?", fields: { title: "Título", slug: "Slug", category: "Categoría", excerpt: "Extracto", content: "Contenido", media: "URL de medios", translations: "Traducciones manuales", lang: "Idioma" }, no_articles: "Sin artículos." },
      categories: { philosophy: "Filosofía", science: "Ciencia experimental", sexuality: "Cultura sexual", general: "General" },
      footer: "© Khaleff To'raf",
    },
  },
  de: {
    translation: {
      brand: "Khaleff To3raf", slogan: "Wo Gewissheiten zerbrechen und Fragen geboren werden",
      tagline: "Philosophie • Wissenschaft • kultur",
      nav: { home: "Start", articles: "Artikel", admin: "Admin" },
      hero: { cta_read: "Lesen beginnen", cta_about: "Über", eyebrow: "Eine intellektuelle Plattform gegen das Gewöhnliche" },
      filters: { all: "Alle", search: "Suchen..." },
      article: { read_more: "Lesen", translating: "Übersetze...", translated_notice: "Automatisch übersetzt", back: "← Zurück", no_articles: "Keine Artikel." },
      theme: { label: "Thema", cyber: "Cyber-Tempel", papyrus: "Antikes Papyrus", marble: "Klassischer Marmor" },
      lang: { label: "Sprache" },
      admin: { title: "Dashboard", login: "Anmelden", password: "Passwort", wrong_password: "Falsches Passwort", logout: "Abmelden", new_article: "Neuer Artikel", edit: "Bearbeiten", delete: "Löschen", save: "Speichern", cancel: "Abbrechen", confirm_delete: "Löschen?", fields: { title: "Titel", slug: "Slug", category: "Kategorie", excerpt: "Auszug", content: "Inhalt", media: "Medien-URL", translations: "Manuelle Übersetzungen", lang: "Sprache" }, no_articles: "Keine Artikel." },
      categories: { philosophy: "Philosophie", science: "Wissenschaft", sexuality: "Sexualkultur", general: "Allgemein" },
      footer: "© Khaleff To'raf",
    },
  },
};

if (!i18n.isInitialized) {
  const chain = typeof window !== "undefined" ? i18n.use(LanguageDetector) : i18n;
  chain
    .use(initReactI18next)
    .init({
      resources,
      lng: typeof window === "undefined" ? "ar" : undefined,
      fallbackLng: "ar",
      supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ["cookie", "localStorage"],
        lookupCookie: "kt_lang",
        lookupLocalStorage: "kt_lang",
        caches: ["cookie", "localStorage"],
        cookieMinutes: 60 * 24 * 365,
        cookieOptions: { path: "/", sameSite: "lax" },
      },
    });
}

export default i18n;
