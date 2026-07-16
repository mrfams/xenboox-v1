# I18N_STRATEGY.md — Internationalization Strategy

> How Xenboox speaks the language of every market it enters.
> Africa-first. English-first. Everything else is a phase.

---

## Table of Contents

1. [Language Support Plan](#1-language-support-plan)
2. [What Needs Localization](#2-what-needs-localization)
3. [Technical Implementation](#3-technical-implementation)
4. [Currency & Number Formatting](#4-currency--number-formatting)
5. [Agent Localization](#5-agent-localization)
6. [Message File Structure](#6-message-file-structure)
7. [Cost Impact](#7-cost-impact)

---

## 1. Language Support Plan

### Phased Rollout

| Phase | Markets | Languages | Timeline |
|-------|---------|-----------|----------|
| **Phase 1 — MVP** | The Gambia, Nigeria, Ghana | English only | Launch |
| **Phase 2 — Francophone** | Senegal | French (fr) | +3 months post-launch |
| **Phase 3 — Local Languages** | Evaluated per market | Wolof, Hausa, Akan | +12 months, demand-driven |

### Phase 1: English Only (MVP)

- All UI, error messages, emails, and agent responses in English.
- Date/number formatting configurable per-market (Gambia vs Nigeria vs Ghana use different conventions even within English).
- Currency formatting locked to market.
- No i18n library needed yet — just hardcoded English strings with market-aware formatting utilities.
- **Why:** Ship fast. Validate product-market fit. Localization infrastructure is a distraction before you have users.

### Phase 2: French (Senegal)

- Add `next-intl` (or equivalent) and extract all strings to message files.
- French translation of UI strings, error messages, and email templates.
- CFO Agent gets a French system prompt variant.
- Date format switches to DD/MM/YYYY (already default in English for these markets).
- Number formatting: French uses space as thousands separator and comma as decimal (e.g., `1 000,00`).

### Phase 3: Local Languages (Evaluate Carefully)

**Do not localize into Wolof, Hausa, or Akan unless:**
- User research shows demand from actual users (not assumptions).
- LLM output quality in those languages is acceptable (test with Claude first).
- Regulatory requirements force it.

**Arguments against local languages for accounting software:**
- Accounting is a formal domain. Users expect professional, standardized language.
- Financial terminology (audit, depreciation, PAYE) doesn't translate cleanly to all local languages.
- AI agent responses in low-resource languages will be unreliable.
- Maintaining 6+ language files for niche markets is expensive.
- Gambian, Nigerian, and Ghanaian professionals already operate in English.

**Recommendation:** Skip Phase 3 unless user research demands it. Focus on making English and French excellent rather than many languages mediocre.

---

## 2. What Needs Localization

### Full Inventory

| Category | Examples | Priority | Phase |
|----------|----------|----------|-------|
| **UI Labels & Navigation** | "Dashboard", "Invoices", "Pay Run", "Settings" | Critical | 2 |
| **Buttons & Actions** | "Save", "Cancel", "Submit", "Approve", "Reject" | Critical | 2 |
| **Error Messages** | "Invalid amount", "Payment failed", "Session expired" | Critical | 2 |
| **Form Validation** | "Required field", "Must be a positive number", "Invalid email" | Critical | 2 |
| **Empty States** | "No invoices found", "No employees yet" | High | 2 |
| **Success/Confirmation Messages** | "Invoice created", "Pay run completed" | High | 2 |
| **Email Templates** | Payroll notifications, invoice receipts, compliance alerts | High | 2 |
| **Date Formats** | DD/MM/YYYY (all Africa markets) | Critical | 1 (configurable) |
| **Number Formats** | Thousands separator, decimal character | Critical | 1 (configurable) |
| **Currency Formats** | Symbol placement, code display | Critical | 1 (configurable) |
| **Tax Terminology** | PAYE, VAT, withholding tax | Critical | 1 (use English terms) |
| **AI Agent Responses** | CFO summaries, compliance alerts, insights | High | 2 |
| **PDF Exports** | Invoices, payslips, reports | Medium | 2 |
| **Toast Notifications** | "Payment recorded", "Backup complete" | Medium | 2 |
| **Help Text / Tooltips** | "Enter the gross salary before deductions" | Low | 2 |

### What Does NOT Need Localization

| Category | Reason |
|----------|--------|
| **Accounting codes** | G/L account names are universal. "1000 — Cash" stays as-is. |
| **Currency codes** | ISO 4217 codes (GMD, NGN, GHS, XOF) are universal. |
| **Tax type abbreviations** | PAYE, VAT are used in English across all target markets. Senegal uses "TVA" (Taxe sur la Valeur Ajoutée) — translate the full name but keep the abbreviation. |
| **Legal entity names** | Company names are not translated. |
| **RTL support** | Not needed. All target markets use left-to-right scripts. |
| **Currency symbols** | Unicode symbols (₦, GH₵) are universal. |

### Tax Terminology Notes

English-speaking African markets adopted their tax systems from the British model. The terminology is consistent:

| Term | Gambia | Nigeria | Ghana | Senegal (French) |
|------|--------|---------|-------|------------------|
| Income tax | PAYE | PAYE | PAYE | IRPP |
| Sales tax | VAT | VAT | VAT | TVA |
| Withholding tax | WHT | WHT | WHT | RET, RTS |
| Tax ID | TIN | TIN | TIN | NIF |

**Strategy:** Keep English tax terms in English-speaking markets. Translate only the full names for French UI (abbreviation stays). Never translate the abbreviation itself — it's a legal/regulatory identifier.

---

## 3. Technical Implementation

### Library Choice: `next-intl`

`next-intl` is the right choice for this stack because:

- Native Next.js 15 App Router support.
- Works with Server Components and Client Components.
- Supports static rendering and dynamic rendering.
- Battle-tested in production.
- Small bundle size.
- No runtime overhead for Server Components.

**Alternatives considered:**
- `react-intl` (FormatJS): More complex setup, less Next.js-native.
- `next-i18next`: Pages Router focus, not ideal for App Router.
- Custom solution: Reinventing the wheel, no community support.

### Installation

```bash
pnpm add next-intl
```

### Configuration

```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}/common.json`)).default,
  };
});
```

```typescript
// i18n/config.ts
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};
```

### Middleware

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never', // Use cookie-based detection for MVP
});

export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
};
```

### Server Components vs Client Components

**Server Components (default):**

```tsx
// app/[locale]/dashboard/page.tsx
import { useTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await useTranslations('dashboard');
  return <h1>{t('title')}</h1>;
}
```

**Client Components:**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function PayRunButton() {
  const t = useTranslations('payroll');
  return <Button>{t('startPayRun')}</Button>;
}
```

**Rule:** Always use Server Components unless you need interactivity. Pass translated strings as props if a child component needs them — don't import `useTranslations` in deeply nested client components.

### tRPC Error Localization

tRPC errors are localized on the **server side** within procedure middleware:

```typescript
// lib/trpc/middleware/locale.ts
import { getLocale } from 'next-intl/server';

export async function localizedErrorMessage(
  ctx: TRPCContext,
  key: string,
  params?: Record<string, string>
) {
  const locale = ctx.locale ?? 'en';
  const messages = await import(`../../../locales/${locale}/errors.json`);
  const template = messages.default[key] ?? key;

  if (params) {
    return Object.entries(params).reduce(
      (msg, [k, v]) => msg.replace(`{${k}}`, v),
      template
    );
  }
  return template;
}
```

**Pattern:** tRPC procedures return error keys, not error messages. The client receives the key and renders it using the localized message catalog. This avoids sending large translation bundles over the wire.

```typescript
// Server: throw with key
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'invoice.invalidAmount',
});

// Client: translate on render
const t = useTranslations('errors');
toast.error(t('invoice.invalidAmount'));
```

### Agent Response Localization

Agents return structured responses. Localization happens at the **presentation layer**, not inside the agent. See [Section 5: Agent Localization](#5-agent-localization).

---

## 4. Currency & Number Formatting

### Formatting Utilities

```typescript
// lib/format/currency.ts
import { type Locale } from '../../i18n/config';

type MarketConfig = {
  currency: string;
  currencyCode: string;
  symbol: string;
  locale: Locale;
  decimalPlaces: number;
};

const marketConfigs: Record<string, MarketConfig> = {
  GM: { currency: 'GMD', currencyCode: 'GMD', symbol: 'D', locale: 'en', decimalPlaces: 2 },
  NG: { currency: 'NGN', currencyCode: 'NGN', symbol: '₦', locale: 'en', decimalPlaces: 2 },
  GH: { currency: 'GHS', currencyCode: 'GHS', symbol: 'GH₵', locale: 'en', decimalPlaces: 2 },
  SN: { currency: 'XOF', currencyCode: 'XOF', symbol: 'XOF', locale: 'fr', decimalPlaces: 0 },
};

export function formatCurrency(
  amount: number,
  countryCode: string,
  options?: { showCode?: boolean }
): string {
  const config = marketConfigs[countryCode];
  if (!config) return `${amount}`;

  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currencyCode,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  });

  const formatted = formatter.format(amount);

  if (options?.showCode) {
    return `${formatted} ${config.currencyCode}`;
  }
  return formatted;
}
```

### Per-Market Formatting Reference

| Market | Currency | Intl Code | Example (1,000) | Intl Output |
|--------|----------|-----------|-----------------|-------------|
| Gambia | Dalasi | GMD | D 1,000.00 | `D 1,000.00` |
| Nigeria | Naira | NGN | ₦1,000.00 | `₦1,000.00` |
| Ghana | Cedi | GHS | GH₵1,000.00 | `GH₵1,000.00` |
| Senegal | CFA Franc | XOF | 1 000 XOF | `1 000 XOF` |

### Date Formatting

```typescript
// lib/format/date.ts
import { type Locale } from '../../i18n/config';

export function formatDate(
  date: Date,
  countryCode: string,
  style: 'short' | 'long' | 'full' = 'short'
): string {
  const locale = countryCode === 'SN' ? 'fr-SN' : 'en-GB';

  const options: Intl.DateTimeFormatOptions =
    style === 'full'
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : style === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: '2-digit', day: '2-digit' };

  return new Intl.DateTimeFormat(locale, options).format(date);
}
```

**Date format per market:**

| Market | Short | Long | Example |
|--------|-------|------|---------|
| Gambia | DD/MM/YYYY | 10 July 2026 | 10/07/2026 |
| Nigeria | DD/MM/YYYY | 10 July 2026 | 10/07/2026 |
| Ghana | DD/MM/YYYY | 10 July 2026 | 10/07/2026 |
| Senegal | DD/MM/YYYY | 10 juillet 2026 | 10/07/2026 |

**Note:** All Africa markets use DD/MM/YYYY. Never use MM/DD/YYYY. The `en-GB` locale handles this correctly.

### Number Formatting

| Market | Thousands | Decimal | Example (1234567.89) |
|--------|-----------|---------|----------------------|
| Gambia | `,` | `.` | 1,234,567.89 |
| Nigeria | `,` | `.` | 1,234,567.89 |
| Ghana | `,` | `.` | 1,234,567.89 |
| Senegal | ` ` (space) | `,` | 1 234 567,89 |

Use `Intl.NumberFormat` for all number display. Never hardcode separators.

---

## 5. Agent Localization

### Core Principle

**Agents do not translate. They compose in the user's language.**

The CFO Agent doesn't generate text in English and then translate it. It generates text directly in the target language by receiving a language instruction in its system prompt.

### System Prompt Injection

```typescript
// packages/agents/core/system-prompts.ts
import { type Locale } from '../../i18n/config';

const languageInstructions: Record<Locale, string> = {
  en: 'Respond in clear, professional English. Use plain language accessible to non-accountants.',
  fr: 'Répondez en français clair et professionnel. Utilisez un langage simple, accessible aux non-comptables.',
};

export function buildSystemPrompt(
  basePrompt: string,
  locale: Locale,
  entityContext: EntityContext
): string {
  return `${basePrompt}

LANGUAGE INSTRUCTION: ${languageInstructions[locale] ?? languageInstructions.en}

You are operating in ${entityContext.countryName}. Format all currency as ${entityContext.currencyCode}. Use local tax terminology for ${entityContext.countryCode}.`;
}
```

### Language Detection Flow

```
1. User's locale is stored in session cookie (set by middleware)
2. All tRPC procedures receive locale from context
3. Agent invocations pass locale in the state
4. Agent system prompt includes language instruction
5. Agent responds in the detected language
```

### When to Translate vs When Not To

| Content | Translate? | Reason |
|---------|-----------|--------|
| Agent narrative summaries | Yes | User-facing, must be in user's language |
| Tax/legal terms (PAYE, VAT) | No (abbreviation) | Regulatory identifiers are universal |
| Tax full names | Yes | "Pay As You Earn" → "Impôt sur le Revenu" |
| Account names | No | Chart of accounts is internal |
| Error explanations from agents | Yes | Must be understood by user |
| Confidence scores | No | Numbers are universal |
| Agent action logs | No | Internal audit trail, English only |

### Agent Response Format

Agents return structured data. Localization is applied at the presentation layer:

```typescript
type AgentResponse = {
  summary: string;           // Localized narrative
  action: string;            // Action key, not localized text
  data: Record<string, unknown>;
  confidence: number;        // Never localized
  metadata: {
    locale: Locale;          // What language was used
    tokensUsed: number;      // Cost tracking
  };
};
```

---

## 6. Message File Structure

### Directory Layout

```
locales/
├── en/
│   ├── common.json          # Shared terms: buttons, labels, nav
│   ├── dashboard.json       # Dashboard module
│   ├── invoicing.json       # Invoicing module
│   ├── payroll.json         # Payroll module
│   ├── expenses.json        # Expense module
│   ├── reporting.json       # Reporting module
│   ├── compliance.json      # Compliance module
│   ├── settings.json        # Settings module
│   ├── errors.json          # All error messages
│   ├── emails.json          # Email template strings
│   └── agent.json           # Agent UI strings
├── fr/
│   ├── common.json
│   ├── dashboard.json
│   ├── invoicing.json
│   ├── payroll.json
│   ├── expenses.json
│   ├── reporting.json
│   ├── compliance.json
│   ├── settings.json
│   ├── errors.json
│   ├── emails.json
│   └── agent.json
```

### Message File Rules

1. **One module = one file.** Never dump everything into `common.json`.
2. **Use nested keys** for logical grouping.
3. **Pluralization** via `next-intl` ICU syntax.
4. **Parameter interpolation** with `{variable}` syntax.
5. **No hardcoded strings in components.** Every user-visible string goes through `t()`.

### Example Message Files

**`locales/en/errors.json`:**
```json
{
  "auth": {
    "sessionExpired": "Your session has expired. Please sign in again.",
    "invalidCredentials": "Invalid email or password.",
    "mfaRequired": "Two-factor authentication is required."
  },
  "invoice": {
    "invalidAmount": "Amount must be greater than zero.",
    "duplicateNumber": "An invoice with this number already exists.",
    "pastDueDate": "Due date cannot be in the past."
  },
  "payroll": {
    "emptyPayRun": "No employees to process. Add employees first.",
    "alreadyProcessed": "This pay run has already been processed.",
    "bankFileError": "Failed to generate bank transfer file."
  },
  "general": {
    "networkError": "Connection lost. Check your internet and try again.",
    "serverError": "Something went wrong. Our team has been notified.",
    "permissionDenied": "You don't have permission to do this."
  }
}
```

**`locales/fr/errors.json`:**
```json
{
  "auth": {
    "sessionExpired": "Votre session a expiré. Veuillez vous reconnecter.",
    "invalidCredentials": "Email ou mot de passe incorrect.",
    "mfaRequired": "L'authentification à deux facteurs est requise."
  },
  "invoice": {
    "invalidAmount": "Le montant doit être supérieur à zéro.",
    "duplicateNumber": "Une facture avec ce numéro existe déjà.",
    "pastDueDate": "La date d'échéance ne peut pas être dans le passé."
  },
  "payroll": {
    "emptyPayRun": "Aucun employé à traiter. Ajoutez des employés d'abord.",
    "alreadyProcessed": "Cette paie a déjà été traitée.",
    "bankFileError": "Échec de la génération du fichier de virement bancaire."
  },
  "general": {
    "networkError": "Connexion perdue. Vérifiez votre internet et réessayez.",
    "serverError": "Une erreur s'est produite. Notre équipe a été notifiée.",
    "permissionDenied": "Vous n'avez pas la permission de faire cela."
  }
}
```

**`locales/en/common.json`:**
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "invoicing": "Invoicing",
    "payroll": "Payroll",
    "expenses": "Expenses",
    "reporting": "Reporting",
    "compliance": "Compliance",
    "settings": "Settings"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "submit": "Submit",
    "approve": "Approve",
    "reject": "Reject",
    "export": "Export",
    "import": "Import"
  },
  "status": {
    "draft": "Draft",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
    "paid": "Paid",
    "overdue": "Overdue"
  },
  "empty": {
    "noResults": "No results found.",
    "noData": "No data available yet."
  }
}
```

### Translation Workflow

1. English is the **source of truth.** All new strings are written in English first.
2. English strings are reviewed before any translation happens.
3. French translations are done by a human translator (not machine translation for user-facing text).
4. Agent prompts are translated by a bilingual accountant or finance professional.
5. QA is done by native speakers in each market before release.

---

## 7. Cost Impact

### LLM Token Costs

Localization **does** increase LLM costs. Here's the breakdown:

| Factor | Impact | Mitigation |
|--------|--------|------------|
| **System prompt overhead** | +50-100 tokens per invocation for language instruction | Negligible |
| **French output tokens** | ~10-15% more tokens than English (French uses more words for the same concept) | Acceptable |
| **Input token inflation** | French UI text in context windows uses more tokens | Keep messages concise |
| **Prompt caching** | System prompts are cacheable — language instruction is cached after first call | Use `cache_control` |
| **Agent response length** | Same content, more tokens in French | Summarize aggressively |

### Cost Estimation Per Market

Assuming Claude Sonnet 4.6 pricing (~$3/MTok input, ~$15/MTok output):

| Scenario | English | French | Delta |
|----------|---------|--------|-------|
| CFO monthly summary | ~800 tokens | ~900 tokens | +12% |
| Compliance check | ~500 tokens | ~570 tokens | +14% |
| Invoice categorization | ~300 tokens | ~340 tokens | +13% |
| **Monthly per-user cost** | ~$0.15 | ~$0.17 | +$0.02 |

**Verdict:** Localization adds ~$0.02/user/month to LLM costs. Not significant.

### Strategies to Keep Costs Down

1. **Cache aggressively.** System prompts are identical for every user in the same locale. Cache them.
2. **Use Haiku for high-volume, low-complexity tasks.** French translation overhead is smaller on cheaper models.
3. **Keep messages concise.** Shorter prompts = fewer tokens. Enforce max lengths in message files.
4. **Don't translate internal agent reasoning.** Agents think in English internally. Only the final output is translated.
5. **Batch translations.** If translating agent responses at the presentation layer, batch them to reduce API calls.

```typescript
// Example: Agent thinks in English, output is localized
type InternalAgentState = {
  reasoning: string;           // Always English, not exposed to user
  structuredOutput: Record<string, unknown>;  // Locale-agnostic data
};

type LocalizedAgentOutput = {
  summary: string;            // Translated at presentation layer
  data: Record<string, unknown>;
  confidence: number;
};
```

### Monitoring

Track per-locale token usage in LangFuse. Set alerts if French costs exceed English by more than 20% — that indicates a prompt optimization opportunity.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| `next-intl` over alternatives | Best App Router support, smallest footprint |
| English only for MVP | Ship fast, validate before investing in translations |
| Skip local languages (Phase 3) | Low ROI, AI quality issues, professional users expect English |
| Agents think in English internally | Reduces LLM costs, maintains reasoning quality |
| Translate at presentation layer | Decouples agent logic from localization |
| DD/MM/YYYY for all markets | Consistent across all Africa targets |
| `Intl.NumberFormat` for all formatting | Zero dependencies, handles all edge cases |
| Tax abbreviations not translated | Regulatory identifiers, not natural language |

---

> **Owner:** Engineering
> **Last Updated:** 2026-07-10
> **Review:** Revisit Phase 3 decision after 6 months of market data from Phase 1 launch.
