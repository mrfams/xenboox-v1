# Self-Service Tax — Research, Model, and Capabilities

> Xenboox ships presets for eight countries and lets **any** business anywhere
> define, version, and compute its own taxes — because we will never be in
> every country, and every user should be able to use the product.
>
> This document captures (1) the global research behind the taxonomy,
> (2) how legacy and AI-native platforms model taxes, (3) Xenboox's data
> model and engine, and (4) how to use and extend it.

---

## 1. The global tax taxonomy (what a tax can be)

A tax is defined by three things: **base** (what it applies to), **rate shape**
(how the amount is computed), and **incidence** (who pays/remits). The shapes
below cover essentially every tax on Earth.

### 1.1 Rate shapes (calculation methods)

| Shape                         | Meaning                                                                                                                               | Example                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Flat %**                    | One rate on the taxable base                                                                                                          | Gambia VAT 15%                                                |
| **Progressive brackets**      | Each slice taxed at its band's rate                                                                                                   | UK PAYE 20/40/45%, US federal brackets                        |
| **Edge / level (cumulative)** | Once crossed, the rate applies to the WHOLE amount                                                                                    | "Anything above 10 gets 20%"                                  |
| **Fixed amount**              | Flat charge per transaction/period                                                                                                    | Excise stamp, license fee                                     |
| **Conditional**               | Rate depends on context — product category, customer type, location, **tax status** (citizen / non-resident), employment type, amount | Reduced VAT for essentials; 30% WHT for non-residents         |
| **Combined (components)**     | Several named rates summed into one effective rate                                                                                    | US state + county + city sales tax (4 + 4.5 + 0.375 = 8.875%) |
| **Threshold (exemption)**     | Below X → no tax                                                                                                                      | Personal allowance, de minimis                                |
| **Ceiling (cap)**             | Only the first X of base is taxable                                                                                                   | Social-security wage base                                     |
| **Split contributions**       | Employee % + employer % on the same base                                                                                              | SSHFC 5%+10%, FICA 6.2%+6.2%                                  |
| **Rounding rules**            | Round off type (normal/down/up) + precision (0.01, 0.05, 1)                                                                           | EU VAT rounding                                               |

### 1.2 The tax families (rule types)

| Family                              | Base                                                                          | Incidence                                            | Notes / examples                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **VAT**                             | Value added at each stage                                                     | Consumer pays, business remits (net of input credit) | GM 15%, SN 18%, GB 20%, ZA 15%, NG 7.5%, KE 16%                                               |
| **Sales / Use tax**                 | Final retail sale                                                             | Consumer                                             | US state+local, destination-based                                                             |
| **PAYE / income tax**               | Employee gross pay                                                            | Employee (withheld)                                  | Progressive brackets + personal relief in GM, SN, NG, KE, GH, US, GB, ZA                      |
| **Withholding tax**                 | Payments to payees (contracts, interest, dividends, royalties, non-residents) | Deducted at source by payer                          | GM 10%, US backup 24%, GB 20% interest/royalties, ZA 20% dividends                            |
| **Corporate / company tax**         | Taxable profits                                                               | Company                                              | GM 27%, US 21%, GB 25% (19% small), ZA 27%, SN 30%, plus minimum taxes and Pillar Two top-ups |
| **Social security / pension**       | Employee earnings, capped                                                     | Employee + employer split                            | SSHFC, IPRES+CSS, FICA, NSSF, SSNIT, UIF, NIC                                                 |
| **Payroll tax**                     | Total payroll                                                                 | Employer                                             | SDL 1% (ZA), FUTA (US)                                                                        |
| **Health / unemployment levies**    | Earnings                                                                      | Employee/employer                                    | NHIF, unemployment insurance                                                                  |
| **Excise duty**                     | Specific goods (fuel, alcohol, tobacco)                                       | Consumer                                             | Per-unit or ad valorem                                                                        |
| **Customs / import duty**           | Goods crossing borders                                                        | Importer                                             | HS-code based ad valorem                                                                      |
| **Digital services tax**            | Gross digital revenue                                                         | Platform                                             | 2–6% in DST jurisdictions                                                                     |
| **Property tax**                    | Assessed property value                                                       | Owner                                                | Municipal annual                                                                              |
| **Wealth tax**                      | Net wealth above a floor                                                      | Owner                                                | Progressive, high exemption                                                                   |
| **Capital gains tax**               | Gain on disposal (proceeds − basis)                                           | Seller                                               | Flat or integrated with income bands                                                          |
| **Stamp / transfer duty**           | Transaction value on conveyances                                              | Buyer                                                | Tiered brackets (UK SDLT up to 12%+)                                                          |
| **Gift / inheritance / estate tax** | Transfers                                                                     | Donor/estate                                         | Exemption thresholds, progressive                                                             |
| **Environmental / carbon tax**      | Emissions / energy units                                                      | Business                                             | Per-ton or per-unit                                                                           |
| **Tourist / bed tax**               | Room nights                                                                   | Guest                                                | Flat per night or % surcharge                                                                 |
| **License / permit fees**           | Operating privilege                                                           | Business                                             | Fixed recurring                                                                               |
| **Other**                           | Anything else                                                                 | —                                                    | Free-form name + any shape above                                                              |

**Design principle:** any tax on Earth = one family + one shape (or a
conditional combination). The engine is shape-driven, so the family list can
grow without engine changes.

---

## 2. How accounting platforms model taxes (research)

### 2.1 Legacy / enterprise platforms

| Platform                 | Core entities                                                             | How combined rates work                                                                                  | Thresholds / caps                                                    | Rounding                                            |
| ------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| **Xero**                 | Tax Rates + Tax Components + Tax Types (`INPUT`/`OUTPUT`/`EXEMPTINPUT`)   | A tax rate contains multiple components (state + municipal) with individual names, percentages and types | Effective-dated rates; exempt/zero-rated via tax types               | Standard                                            |
| **QuickBooks Online**    | Tax Agencies + Tax Rates + Tax Groups                                     | Tax groups combine several rates (state + county + city) into one selectable rate                        | Exempt customers via reason + certificate                            | Standard                                            |
| **Dynamics 365 Finance** | Tax Codes + Tax Groups + Item Tax Groups                                  | Tax on tax (cascading) via "calculate tax on tax"; marginal bases (per line/unit/invoice)                | **Limits**: min/max taxable amount, min/max tax amount; exempt codes | **Round-off type** (normal/down/up) + **precision** |
| **Oracle NetSuite**      | Nexus + Tax Codes + Tax Schedules + Tax Types + Tax Groups + Tax Agencies | Tax groups compose multiple tax codes (e.g. GST+PST composite); reverse charge for EU/UK VAT             | Nexus defines where you owe; country-specific setups                 | SuiteTax localized                                  |
| **Sage / SAP**           | Tax codes + determination rules                                           | Cascading taxes (ICMS/IPI in Brazil), gross/net bases                                                    | Condition tables with thresholds                                     | Country-specific                                    |

**Key takeaways implemented in Xenboox:**

- **Combined rates** → `components` on the rate type (Xero's model, simplest).
- **Tax groups (QBO/NetSuite)** → the same job as components; we chose
  components over a separate table (DRY with the existing JSONB config).
- **Min/max taxable amount** → `threshold` (exemption) + `ceiling` (cap).
- **Round-off type + precision** → `rounding` on the config.
- **Exempt customers** → per-person rate overrides (rate 0) + exemption
  thresholds, mirroring QBO exempt customers.
- **Per-item taxability** → conditional rules on `product_category`.
- **Nexus** → country-scoped rules per entity.

### 2.2 AI-native / fintech platforms (Digits, Basis, Zeni, Pilot, Ramp, BILL, TaxJar/Avalara)

- **Configured codes, not hardcoded law**: Ramp/BILL/Melio let users define tax
  codes/rates that map to COA lines; Digits/Zeni _learn_ tax treatment from
  history instead of shipping per-country tables.
- **Live-rate engines are externalized**: sales tax is typically delegated to
  Avalara / TaxJar / Stripe Tax APIs (13,000+ US jurisdictions); payroll tax is
  delegated to Gusto / ADP / Rippling integrations.
- **Rule engines are data**: rules stored as JSON-logic decision trees;
  progressive tables as `[lower, upper, base, marginal rate]` matrices.
- **UX**: "tax readiness" dashboards and plain-language queries rather than
  dense forms; firm-facing tools (Basis) automate first-pass returns.

**Xenboox position:** we are more configurable than the AI-native players
(real rule builder, versioned, payroll-integrated) and simpler than the
enterprise engines — with the same data-model concepts (components, limits,
rounding, groups-via-components, overrides). Avalara-style live-rate lookup
is a documented roadmap item (Section 5).

---

## 3. Xenboox implementation

### 3.1 Data model

- `jurisdiction_tax_rules` — versioned rules (`version`, `status`, effective
  dates, approval fields) with a JSONB `rateOrBands` config:
  `type: rate | fixed | bands | conditional`, plus `components`, `threshold`,
  `ceiling`, `employeeRate`/`employerRate`, `rounding`.
- `tax_rate_overrides` — per-customer/vendor/employee/product_category rates
  (effective-dated, audited).
- `tax_rule_type` enum: 22 families (see table in §1.2).
- `employees.tax_status` — `resident | non_resident | citizen | non_citizen |
tax_exempt`, feeding conditional payroll rules.

### 3.2 Engine (`packages/agents/core/tax-engine.ts`)

Pure, data-driven, shared by Settings preview, payroll pipeline, and
tax-compliance pipeline. Supports every shape in §1.1, including edge
(cumulative) brackets, component sums with per-component breakdown, rounding
modes, and `tax_status` / `employment_type` condition fields.

### 3.3 Payroll integration

User-configured PAYE / social-security / withholding rules are resolved per
employee (`statutory-rule-resolver` + `conditionalStatutoryRuleOverride`) so
editing a rate or adding a non-citizen condition changes payroll output
without a redeploy.

### 3.4 Where in the product

**Settings → Taxes** (`/dashboard/settings`): pick a country (190+), install a
one-click pack, edit any rule (creates a new audited version), or build custom
taxes with live preview.

### 3.5 Shipped country packs

Gambia, Senegal, USA, Nigeria, Kenya, Ghana, **United Kingdom**, **South
Africa** — each with VAT/sales tax, PAYE, social security, withholding, and
corporate presets sourced from current statutory research, clearly marked as
starting points to verify.

---

## 4. Adding a country (no code)

1. Pick the ISO code from the country picker.
2. Install a pack if one exists, or create each tax rule (name, type, shape,
   effective date).
3. Edit rates when laws change — each edit versions and is audit-logged.
   To ship a pack in the catalog: append entries to
   `packages/agents/core/tax-presets.ts` (data only) and extend
   `tax-presets.test.ts`'s valid-type set if a new family is used.

---

## 5. Known limitations & roadmap

- **Tax-on-tax (cascading)** across separate rules is not yet expressible —
  deferred; single-rule "percentage of gross" bases are the workaround.
- **Live sales-tax rate lookup** (Avalara/TaxJar-style) is a separate
  integration, not built in.
- **Item tax groups** (Dynamics/NetSuite) are approximated by conditional
  `product_category` rules.
- **Auto-filing** lives in the tax-compliance pipeline/packages, not in this
  module.
- Rates in presets are research-backed starting points — always verify against
  current local law before filing.
