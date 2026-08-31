"use client";

// ─── Internationalization (i18n) ───────────────────────────────────────────
//
// Multi-language support for the platform.
// Currently supports: English, French, Arabic (RTL), Spanish.
// Uses a simple key-value translation system.

export type Locale = "en" | "fr" | "ar" | "es";

export type TranslationKeys = {
  // Navigation
  "nav.commandCenter": string;
  "nav.activityHub": string;
  "nav.financialPulse": string;
  "nav.ledger": string;
  "nav.operations": string;
  "nav.knowledgeBase": string;
  "nav.knowledgeGraph": string;
  "nav.batchIngestion": string;
  "nav.autoApprove": string;
  "nav.settings": string;
  "nav.help": string;

  // Common
  "common.search": string;
  "common.filter": string;
  "common.export": string;
  "common.import": string;
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.create": string;
  "common.view": string;
  "common.loading": string;
  "common.error": string;
  "common.success": string;
  "common.noData": string;

  // Financial
  "finance.revenue": string;
  "finance.expenses": string;
  "finance.profit": string;
  "finance.loss": string;
  "finance.balance": string;
  "finance.invoice": string;
  "finance.bill": string;
  "finance.payment": string;
  "finance.receipt": string;
  "finance.account": string;
  "finance.bankAccount": string;
  "finance.journalEntry": string;
  "finance.trialBalance": string;
  "finance.cashFlow": string;
  "finance.forecast": string;

  // Actions
  "action.approve": string;
  "action.reject": string;
  "action.reconcile": string;
  "action.post": string;
  "action.void": string;
  "action.pay": string;
  "action.remind": string;

  // AI
  "ai.thinking": string;
  "ai.analyzing": string;
  "ai.generating": string;
  "ai.searching": string;
  "ai.confidence": string;
  "ai.insight": string;
  "ai.suggestion": string;

  // Time
  "time.today": string;
  "time.yesterday": string;
  "time.thisWeek": string;
  "time.thisMonth": string;
  "time.lastMonth": string;
  "time.thisYear": string;
};

const TRANSLATIONS: Record<Locale, TranslationKeys> = {
  en: {
    // Navigation
    "nav.commandCenter": "Command Center",
    "nav.activityHub": "Activity Hub",
    "nav.financialPulse": "Financial Pulse",
    "nav.ledger": "Ledger",
    "nav.operations": "Operations",
    "nav.knowledgeBase": "Knowledge Base",
    "nav.knowledgeGraph": "Knowledge Graph",
    "nav.batchIngestion": "Batch Ingestion",
    "nav.autoApprove": "Auto-Approve",
    "nav.settings": "Settings",
    "nav.help": "Help & Support",

    // Common
    "common.search": "Search",
    "common.filter": "Filter",
    "common.export": "Export",
    "common.import": "Import",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.view": "View",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.noData": "No data available",

    // Financial
    "finance.revenue": "Revenue",
    "finance.expenses": "Expenses",
    "finance.profit": "Profit",
    "finance.loss": "Loss",
    "finance.balance": "Balance",
    "finance.invoice": "Invoice",
    "finance.bill": "Bill",
    "finance.payment": "Payment",
    "finance.receipt": "Receipt",
    "finance.account": "Account",
    "finance.bankAccount": "Bank Account",
    "finance.journalEntry": "Journal Entry",
    "finance.trialBalance": "Trial Balance",
    "finance.cashFlow": "Cash Flow",
    "finance.forecast": "Forecast",

    // Actions
    "action.approve": "Approve",
    "action.reject": "Reject",
    "action.reconcile": "Reconcile",
    "action.post": "Post",
    "action.void": "Void",
    "action.pay": "Pay",
    "action.remind": "Send Reminder",

    // AI
    "ai.thinking": "Thinking...",
    "ai.analyzing": "Analyzing...",
    "ai.generating": "Generating...",
    "ai.searching": "Searching...",
    "ai.confidence": "Confidence",
    "ai.insight": "AI Insight",
    "ai.suggestion": "AI Suggestion",

    // Time
    "time.today": "Today",
    "time.yesterday": "Yesterday",
    "time.thisWeek": "This Week",
    "time.thisMonth": "This Month",
    "time.lastMonth": "Last Month",
    "time.thisYear": "This Year",
  },
  fr: {
    // Navigation
    "nav.commandCenter": "Centre de Commande",
    "nav.activityHub": "Hub d'Activité",
    "nav.financialPulse": "Pouls Financier",
    "nav.ledger": "Grand Livre",
    "nav.operations": "Opérations",
    "nav.knowledgeBase": "Base de Connaissances",
    "nav.knowledgeGraph": "Graphe de Connaissances",
    "nav.batchIngestion": "Traitement par Lots",
    "nav.autoApprove": "Approbation Automatique",
    "nav.settings": "Paramètres",
    "nav.help": "Aide & Support",

    // Common
    "common.search": "Rechercher",
    "common.filter": "Filtrer",
    "common.export": "Exporter",
    "common.import": "Importer",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.view": "Voir",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.noData": "Aucune donnée disponible",

    // Financial
    "finance.revenue": "Revenus",
    "finance.expenses": "Dépenses",
    "finance.profit": "Profit",
    "finance.loss": "Perte",
    "finance.balance": "Solde",
    "finance.invoice": "Facture",
    "finance.bill": "Facture Fournisseur",
    "finance.payment": "Paiement",
    "finance.receipt": "Reçu",
    "finance.account": "Compte",
    "finance.bankAccount": "Compte Bancaire",
    "finance.journalEntry": "Écriture Comptable",
    "finance.trialBalance": "Balance",
    "finance.cashFlow": "Flux de Trésorerie",
    "finance.forecast": "Prévisions",

    // Actions
    "action.approve": "Approuver",
    "action.reject": "Rejeter",
    "action.reconcile": "Rapprocher",
    "action.post": "Comptabiliser",
    "action.void": "Annuler",
    "action.pay": "Payer",
    "action.remind": "Envoyer un rappel",

    // AI
    "ai.thinking": "Réflexion...",
    "ai.analyzing": "Analyse...",
    "ai.generating": "Génération...",
    "ai.searching": "Recherche...",
    "ai.confidence": "Confiance",
    "ai.insight": "Analyse IA",
    "ai.suggestion": "Suggestion IA",

    // Time
    "time.today": "Aujourd'hui",
    "time.yesterday": "Hier",
    "time.thisWeek": "Cette Semaine",
    "time.thisMonth": "Ce Mois",
    "time.lastMonth": "Mois Dernier",
    "time.thisYear": "Cette Année",
  },
  ar: {
    // Navigation
    "nav.commandCenter": "مركز الأوامر",
    "nav.activityHub": "مركز النشاط",
    "nav.financialPulse": "النبض المالي",
    "nav.ledger": "دفتر الأستاذ",
    "nav.operations": "العمليات",
    "nav.knowledgeBase": "قاعدة المعرفة",
    "nav.knowledgeGraph": "رسم بياني للمعرفة",
    "nav.batchIngestion": "المعالجة الدفعية",
    "nav.autoApprove": "الموافقة التلقائية",
    "nav.settings": "الإعدادات",
    "nav.help": "المساعدة والدعم",

    // Common
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.export": "تصدير",
    "common.import": "استيراد",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.create": "إنشاء",
    "common.view": "عرض",
    "common.loading": "جاري التحميل...",
    "common.error": "خطأ",
    "common.success": "نجاح",
    "common.noData": "لا تتوفر بيانات",

    // Financial
    "finance.revenue": "الإيرادات",
    "finance.expenses": "المصروفات",
    "finance.profit": "الربح",
    "finance.loss": "الخسارة",
    "finance.balance": "الرصيد",
    "finance.invoice": "فاتورة",
    "finance.bill": "حساب",
    "finance.payment": "دفع",
    "finance.receipt": "إيصال",
    "finance.account": "حساب",
    "finance.bankAccount": "حساب بنكي",
    "finance.journalEntry": "قيد يومية",
    "finance.trialBalance": "ميزان المراجعة",
    "finance.cashFlow": "التدفق النقدي",
    "finance.forecast": "التوقعات",

    // Actions
    "action.approve": "موافقة",
    "action.reject": "رفض",
    "action.reconcile": "تسوية",
    "action.post": "تسجيل",
    "action.void": "إلغاء",
    "action.pay": "دفع",
    "action.remind": "إرسال تذكير",

    // AI
    "ai.thinking": "جاري التفكير...",
    "ai.analyzing": "جاري التحليل...",
    "ai.generating": "جاري الإنشاء...",
    "ai.searching": "جاري البحث...",
    "ai.confidence": "الثقة",
    "ai.insight": "تحليل الذكاء الاصطناعي",
    "ai.suggestion": "اقتراح الذكاء الاصطناعي",

    // Time
    "time.today": "اليوم",
    "time.yesterday": "أمس",
    "time.thisWeek": "هذا الأسبوع",
    "time.thisMonth": "هذا الشهر",
    "time.lastMonth": "الشهر الماضي",
    "time.thisYear": "هذه السنة",
  },
  es: {
    // Navigation
    "nav.commandCenter": "Centro de Comandos",
    "nav.activityHub": "Centro de Actividad",
    "nav.financialPulse": "Pulso Financiero",
    "nav.ledger": "Libro Mayor",
    "nav.operations": "Operaciones",
    "nav.knowledgeBase": "Base de Conocimiento",
    "nav.knowledgeGraph": "Grafo de Conocimiento",
    "nav.batchIngestion": "Procesamiento por Lotes",
    "nav.autoApprove": "Aprobación Automática",
    "nav.settings": "Configuración",
    "nav.help": "Ayuda y Soporte",

    // Common
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.export": "Exportar",
    "common.import": "Importar",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.create": "Crear",
    "common.view": "Ver",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.noData": "Sin datos disponibles",

    // Financial
    "finance.revenue": "Ingresos",
    "finance.expenses": "Gastos",
    "finance.profit": "Ganancia",
    "finance.loss": "Pérdida",
    "finance.balance": "Saldo",
    "finance.invoice": "Factura",
    "finance.bill": "Cuenta",
    "finance.payment": "Pago",
    "finance.receipt": "Recibo",
    "finance.account": "Cuenta",
    "finance.bankAccount": "Cuenta Bancaria",
    "finance.journalEntry": "Asiento Contable",
    "finance.trialBalance": "Balance de Comprobación",
    "finance.cashFlow": "Flujo de Efectivo",
    "finance.forecast": "Pronóstico",

    // Actions
    "action.approve": "Aprobar",
    "action.reject": "Rechazar",
    "action.reconcile": "Conciliar",
    "action.post": "Contabilizar",
    "action.void": "Anular",
    "action.pay": "Pagar",
    "action.remind": "Enviar Recordatorio",

    // AI
    "ai.thinking": "Pensando...",
    "ai.analyzing": "Analizando...",
    "ai.generating": "Generando...",
    "ai.searching": "Buscando...",
    "ai.confidence": "Confianza",
    "ai.insight": "Análisis IA",
    "ai.suggestion": "Sugerencia IA",

    // Time
    "time.today": "Hoy",
    "time.yesterday": "Ayer",
    "time.thisWeek": "Esta Semana",
    "time.thisMonth": "Este Mes",
    "time.lastMonth": "Mes Pasado",
    "time.thisYear": "Este Año",
  },
};

// ─── Translation Function ──────────────────────────────────────────────────

let currentLocale: Locale = "en";

/**
 * Set the current locale.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("xenboox-locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("xenboox-locale") as Locale | null;
    if (stored && stored in TRANSLATIONS) {
      return stored;
    }
  }
  return currentLocale;
}

/**
 * Translate a key to the current locale.
 */
export function t(key: keyof TranslationKeys): string {
  const locale = getLocale();
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

/**
 * Check if current locale is RTL.
 */
export function isRTL(): boolean {
  return getLocale() === "ar";
}

/**
 * Get all available locales.
 */
export function getAvailableLocales(): Array<{
  code: Locale;
  name: string;
  nativeName: string;
}> {
  return [
    { code: "en", name: "English", nativeName: "English" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "es", name: "Spanish", nativeName: "Español" },
  ];
}

/**
 * Format currency based on locale.
 */
export function formatCurrencyLocale(
  amount: number,
  currency: string = "USD",
): string {
  const locale = getLocale();
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    fr: "fr-FR",
    ar: "ar-SA",
    es: "es-ES",
  };

  try {
    return new Intl.NumberFormat(localeMap[locale], {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Format date based on locale.
 */
export function formatDateLocale(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const locale = getLocale();
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    fr: "fr-FR",
    ar: "ar-SA",
    es: "es-ES",
  };

  try {
    return new Intl.DateTimeFormat(localeMap[locale], options).format(
      typeof date === "string" ? new Date(date) : date,
    );
  } catch {
    return new Date(date).toLocaleDateString();
  }
}
