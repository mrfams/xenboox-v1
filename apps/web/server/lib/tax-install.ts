// ─── Shared tax preset installer (re-export) ────────────────────────────────
//
// The single implementation lives in packages/agents/core/tax-install.ts so
// the AI agent tool (install_tax_presets) and the web surfaces (Settings →
// Taxes and the onboarding wizard) share one idempotency + version-continuation
// contract. This module exists so existing web imports keep resolving.
export { installPresetsForEntity } from "@xenboox/agents";
