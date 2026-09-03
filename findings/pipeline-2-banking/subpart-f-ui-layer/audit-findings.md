# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part F — UI Layer — Deep Audit

**Scope:** banking-view (Transactions/Connections/Rules tabs), transaction-row, bank-rules-manager, bank-connection-card/dialog, statement-upload-zone integration, listConnections/createRule/updateRule API contracts, learning-loop UX claims.

---

### 🔴 CRITICAL (3)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                          | Location                                                        | Impact                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| **F1** | **`format` is called but never defined.** `transaction-row.tsx` imports `useFormatCurrency` but never invokes it — line 243 `format(tx.amount)` and line 249 `format(tx.balance)` reference a nonexistent identifier. The transaction list **cannot render amounts** (compile error in the app build).                                                                           | `transaction-row.tsx`                                           | Build-blocking; the core Banking surface shows nothing.        |
| **F2** | **Rules UI match types don't exist in the API.** The form offers `contains` / `starts_with` / `exact` / `regex`, but `createRule`/`updateRule` zod-enums are `description_contains`, `description_equals`, `reference_contains`, `amount_equals`, `amount_above`, `amount_below`. Every rule create/update from the UI fails validation. The Rules tab is **functionally dead**. | `bank-rules-manager.tsx` MATCH_TYPES vs `banking.ts` createRule | Rules — the AI's memory — cannot be created by users.          |
| **F3** | **Export CSV reads fields that don't exist.** `banking-view.tsx` export maps `t.date ?? t.transactionDate` and `t.status` — neither `transactionDate` nor `status` is in the `listTransactions` output type. Export never compiles.                                                                                                                                              | `banking-view.tsx` (Export)                                     | Broken feature; also `status` must derive from `isReconciled`. |

### 🟠 HIGH (4)

| #   | Finding                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| H1  | **Direction display is a lie after P2-B.** `transaction-row.tsx` derives `isPositive = tx.amount > 0` — but amounts are now always-positive magnitudes (P2-B convention), so **every row** renders the green "+" deposit arrow. Direction must come from `tx.type` (`deposit` vs `withdrawal`). |
| H2  | **Confidence is treated as a number but arrives as a string.** `listTransactions` returns `categorizationConfidence` as `string                                                                                                                                                                 | null`(drizzle numeric), yet the row declares`number                                                                                                                                                                                  | null`and does`confidence \* 100`→`NaN` widths/titles for every AI-categorized row. |
| H3  | **"AI automatically creates a rule after 3 overrides" is advertised but unimplemented.** The learning loop (P2-C) upserts `aiCorrections` with `timesSeen`, but nothing ever promotes a pattern to a `bankRules` row. The Rules tab promise is false.                                           |
| H4  | \*\*`entityId: string                                                                                                                                                                                                                                                                           | null`passed where`string`is required** (3 sites: TransactionsTab/ConnectionsTab/RulesTab) +`BankConnectionCard`Connection type mismatches the router (declares`Date`, router returns ISO strings; loose `provider`/`status` unions). |

### 🟡 MEDIUM (2)

| #   | Finding                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | `CategoryPicker currentCategory` prop typed `string \| null` but `tx.category` is optional (`undefined` possible) — type error at the call site. |
| M2  | Delete/disconnect flows use native `confirm()` — jarring, not AI-native, inconsistent with the toast-based pattern.                              |

---

## Fix Plan — Sub-Part F

| #   | Fix                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Wire `useFormatCurrency` in `transaction-row.tsx`: `format(tx.amount, tx.currency)` for amount + balance.                                                                                                                                              |
| F2  | Replace `MATCH_TYPES` with the real API enum (description_contains / description_equals / reference_contains / amount_equals / amount_above / amount_below); type `Rule.matchType` as the union; fix the preview copy; default `description_contains`. |
| F3  | Export uses `t.date` and `t.isReconciled ? "reconciled" : "unreconciled"`.                                                                                                                                                                             |
| H1  | Direction from `tx.type === "deposit"` → green down-arrow + "+"; withdrawals → default-color up-arrow, no sign (magnitude convention).                                                                                                                 |
| H2  | Type `categorizationConfidence?: string \| null`; `Number(confidence)` everywhere it's math'd.                                                                                                                                                         |
| H3  | **Implement the advertised learning**: in `updateTransactionCategory`, after `timesSeen` reaches ≥ 3, auto-create a `description_contains` rule for the vendor (deduped, audit-logged) so the UI claim becomes true.                                   |
| H4  | Tab `entityId` props accept `string \| null` (queries already gate on `!!entityId`); align `BankConnectionCard` Connection type to the router output.                                                                                                  |
| M1  | `currentCategory={tx.category ?? null}` at the call site.                                                                                                                                                                                              |
| M2  | Swap native `confirm()` for toast-confirm pattern used elsewhere (banking rules delete + connection disconnect).                                                                                                                                       |

### Verification (after build)

- `apps/web` tsc: **zero** banking-component errors (was 8: 3 rules-manager, 3 transaction-row, 2... plus 6 banking-view → all 12 cleared)
- vitest web banking suites still green; rules CRUD + auto-rule logic covered
- Manual: rules tab can create/update rules; transaction rows show correct direction + currency; export works
