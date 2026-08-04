# Mobile Money API Research — The Gambia & Target Markets

> Research conducted July 2026. Covers API availability, statement formats, fees, compliance, and MVP feasibility for mobile money integration in The Gambia.

---

## 1. Wave

### Status in The Gambia

Wave launched in The Gambia in 2021 and has grown rapidly. As of 2026, Wave Gambia operates under Wave Transfer Limited, registered in The Gambia. The Central Bank of The Gambia lists Wave as a licensed mobile money operator.

**Wave API availability in Gambia**: ✅ Available but limited

| API                             | Availability in Gambia | Notes                                                         |
| ------------------------------- | ---------------------- | ------------------------------------------------------------- |
| Checkout API (collect payments) | ✅ Full                | Currency: GMD (Gambian Dalasi)                                |
| Payout API (send money)         | ⚠️ Limited             | Not fully documented for GMD; contact Wave enterprise support |
| Balance API                     | ✅ Full                | Works with GMD wallets                                        |
| Aggregated Merchants API        | ⚠️ Restricted          | Requires enterprise agreement                                 |

**Key finding**: Wave's Gambia API uses **GMD (Gambian Dalasi)**, not XOF. The API key for Gambia is issued separately from UEMOA-region (Senegal/CI/Mali) keys. You must contact Wave enterprise support to enable GMD on your account.

### Wave Business Portal Onboarding Barrier

Wave's self-serve Business Portal (business.wave.com) requires a **Senegal-registered business phone number** to create an account. This is a significant barrier for Gambian entities:

| Option                                                                      | Feasibility | Timeline  |
| --------------------------------------------------------------------------- | ----------- | --------- |
| Partner with Senegalese registered business                                 | Moderate    | 2-4 weeks |
| Contact Wave directly at business@wave.com for enterprise onboarding        | Recommended | 4-8 weeks |
| Use aggregator (Waychit, Flutterwave, CinetPay) that offers Wave as channel | High        | 1-2 weeks |

**Recommendation**: For MVP, use an aggregator (Waychit) rather than direct Wave API integration.

### Statement Import

Wave does not offer a native statement export API endpoint. Currently:

- **In-app statement**: Wave app shows transaction history (last 90 days)
- **No CSV export**: Wave does not provide downloadable CSV/Excel from the consumer app
- **SMS notifications**: Each transaction generates an SMS (can be parsed)
- **Manual import path**: Screen-scraping is not viable. Users must manually enter or use CSV templates

### Wave Fees (Gambia 2026)

| Transaction Type                | Fee                          |
| ------------------------------- | ---------------------------- |
| P2P transfer                    | 1% (capped at GMD 50 ~$0.85) |
| Cash-in at agent                | Free                         |
| Cash-out at agent               | Free                         |
| Merchant payment (Checkout API) | 1% per transaction           |
| Bank cash-out                   | Flat GMD 50 (~$0.85)         |
| Bulk payout                     | 1%                           |

### Wave API Endpoints (for reference when direct access is available)

| Method | Endpoint                      | Purpose                       |
| ------ | ----------------------------- | ----------------------------- |
| POST   | `/v1/checkout/sessions`       | Create payment session        |
| GET    | `/v1/checkout/sessions/:id`   | Verify payment                |
| POST   | `/v1/payout`                  | Send money to mobile          |
| GET    | `/v1/balance`                 | Wallet balance                |
| GET    | `/v1/transactions`            | Transaction history (per day) |
| POST   | `/v1/transactions/:id/refund` | Refund a transaction          |

---

## 2. Orange Money

### Status in The Gambia

**Orange Money is not available in The Gambia.** Orange operates in Senegal (adjacent) and 17 other markets, but the Orange Money service has not been licensed to operate in The Gambia.

### Availability by Country

| Country        | Orange Money API | Notes                         |
| -------------- | ---------------- | ----------------------------- |
| Senegal        | ✅ Full          | Web Payment API available     |
| Côte d'Ivoire  | ✅ Full          | Mature market                 |
| Mali           | ✅ Full          |                               |
| Guinea Bissau  | ✅ Limited       | Via Orange Developer Portal   |
| Sierra Leone   | ✅ Limited       | Partner API, not self-service |
| Guinea Conakry | ✅ Limited       |                               |
| **The Gambia** | ❌ Not available | No Orange network in Gambia   |

### Orange Money API Requirements

Where available, Orange Money requires:

1. Developer account at developer.orange.com
2. Application for Orange Money Web Payment API
3. Merchant must subscribe to Orange Money at a local Orange store
4. KYA (Know Your Agent) compliance
5. Approval takes 24-72 hours for sandbox access

### API Documentation

Orange Money Web Payment API documentation is available at `developer.orange.com/apis/om-webpay` but the Gambia is not listed as a supported country.

### Implications for Xenboox

**Orange Money integration is not viable for a Gambia-focused MVP.** If Xenboox expands to Senegal or Côte d'Ivoire in the future, Orange Money becomes critical (it has market share in the region). For now, defer.

---

## 3. MTN Mobile Money (MoMo)

### Status in The Gambia

**MTN does not operate in The Gambia.** The Gambia's mobile network operators are Africell (Afrimoney) and QCell (QMoney). MTN operates in 21+ countries but not in Gambia.

### MTN MoMo API

MTN's Mobile Money API is called **MoMo API** and is available via momodeveloper.mtn.com.

| Feature                       | Availability              |
| ----------------------------- | ------------------------- |
| Collection (receive payments) | ✅ In supported OpCos     |
| Disbursement (send money)     | ✅ In supported OpCos     |
| Sandbox                       | ✅ Self-service           |
| Production                    | Requires formal agreement |

### Countries Where MTN MoMo Works

The following OpCos have MTN MoMo API support (as of 2026):

| OpCo           | API Status |
| -------------- | ---------- |
| Uganda         | ✅ Full    |
| Ghana          | ✅ Full    |
| Côte d'Ivoire  | ✅ Full    |
| Cameroon       | ✅ Full    |
| Zambia         | ✅ Full    |
| Benin          | ✅ Full    |
| Guinea Conakry | ✅ Full    |
| Liberia        | ✅ Full    |
| South Africa   | ✅ Full    |
| Congo          | ✅ Full    |
| Rwanda         | ✅ Full    |

**The Gambia is not listed. MTN MoMo API integration is not relevant for Gambia MVP.**

### For Future Expansion

- MTN MoMo is essential for Uganda, Ghana, and Côte d'Ivoire expansion
- Self-service sandbox at momodeveloper.mtn.com (instant access)
- Production requires formal agreement and compliance review
- Uses OAuth 2.0 authentication
- Available as an integration target for future phases

---

## 4. M-Pesa (Safaricom)

### Status in The Gambia

**M-Pesa is not available in The Gambia.** M-Pesa operates primarily in East Africa (Kenya, Tanzania, Mozambique, DRC, Lesotho, Ghana, Egypt) under Safaricom and Vodacom.

### M-Pesa API (Daraja)

Safaricom's Daraja API is available at developer.safaricom.co.ke.

| API                        | Description             | Status                   |
| -------------------------- | ----------------------- | ------------------------ |
| STK Push (M-Pesa Express)  | Customer payment prompt | ✅ Well-documented       |
| C2B (Customer to Business) | Incoming payments       | ✅                       |
| B2C (Business to Customer) | Payouts                 | ✅ Requires bulk account |
| B2B                        | Business transfers      | ✅                       |
| Transaction Status         | Query                   | ✅                       |
| Reversal                   | Reverse transactions    | ✅                       |
| Account Balance            | Query balance           | ✅                       |
| QR Code                    | Generate M-Pesa QR      | ✅                       |

### Key Details for Future Kenya Expansion

- **Registration**: developer.safaricom.co.ke (free sandbox)
- **Production**: Requires registered business (Certificate of Incorporation, KRA PIN, board resolution)
- **Shortcode**: Must apply for PayBill or Till number (KSh 150-500)
- **Settlement**: Funds settle to bank account (not wallet)
- **Go-live timeline**: 2-6 weeks from clean paperwork
- **Fees**: Safaricom's standard M-Pesa merchant rates apply
- **SDK**: mpesakit library available for Node.js/Python

### Phase 2 Recommendation

If Xenboox expands to Kenya, M-Pesa Daraja integration is non-negotiable (over 30M active users, processes KSh 35+ trillion annually). Budget 2-4 weeks for integration, 2-6 weeks for production approval.

---

## 5. Airtel Money

### Status in The Gambia

**Airtel does not operate in The Gambia.** Airtel operates in 14+ countries but Gambia is not one of them.

### Airtel Money API

Airtel provides a developer portal at developers.airtel.africa with collection and disbursement APIs.

| Country    | Airtel Money API Status |
| ---------- | ----------------------- |
| Uganda     | ✅ Full                 |
| Kenya      | ✅ Full                 |
| Tanzania   | ✅ Full                 |
| Rwanda     | ✅ Full                 |
| Malawi     | ✅ Full                 |
| Zambia     | ✅ Full                 |
| Madagascar | ✅                      |
| DRC        | ✅                      |
| Chad       | ✅                      |
| Niger      | ✅                      |
| Gabon      | ✅                      |

### API Requirements

1. Sign up at developers.airtel.africa
2. Register application (get Client ID + Client Secret)
3. Product + country selection
4. Application approval (24-48 hours)
5. IP whitelisting required
6. Disbursement PIN setup for payouts

### For Future Expansion

Airtel Money is important for East African markets (Uganda, Kenya, Tanzania, Zambia). Not relevant for Gambia MVP. Flag for Phase 2 when expanding to those markets.

---

## 6. Realistic MVP Approach

### The Gambia Mobile Money Landscape

| Service              | In Gambia | Has Public API     | Can Import Statements | MVP Feasibility        |
| -------------------- | --------- | ------------------ | --------------------- | ---------------------- |
| Wave                 | ✅        | ✅ (limited)       | ⚠️ Manual             | **Best option**        |
| QMoney (QCell)       | ✅        | ❌ No public API   | ⚠️ Manual             | **Partner needed**     |
| Afrimoney (Africell) | ✅        | ❌ No public API   | ⚠️ Manual             | **Partner needed**     |
| Orange Money         | ❌        | N/A                | N/A                   | Not available          |
| MTN MoMo             | ❌        | N/A                | N/A                   | Not available          |
| M-Pesa               | ❌        | N/A                | N/A                   | Not available          |
| Airtel Money         | ❌        | N/A                | N/A                   | Not available          |
| Waychit (aggregator) | ✅        | ✅ Full            | N/A                   | **Strong alternative** |
| Bank transfers       | ✅        | ✅ (Ecobank, etc.) | ⚠️ CSV                | Phase 2                |

### MVP Recommendation: ModemPay

**Use ModemPay as the primary mobile money integration for MVP.**

Why ModemPay:

- CBG licensed (Central Bank of The Gambia) — Reg No. 2025/C25067
- TypeScript SDK, Node.js SDK, CLI, sandbox
- Wave, Afrimoney, QMoney behind a single API
- 1.5% per mobile money transaction (instant settlement)
- Real-time webhooks with HMAC-SHA256 signature verification
- Idempotent API (safe retries)
- 400K+ transactions processed, 99.9% uptime
- Self-service onboarding, no enterprise contract required
- Supports bank transfers (1.25%), cards (3.5%), stablecoins (1.0%)
- Full audit trail on every API call

### MVP Integration Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Xenboox    │────▶│  ModemPay   │────▶│ Wave / QMoney    │
│  Platform   │     │  API        │     │ / Afrimoney /    │
│             │◀────│  (CBG lic.) │◀────│ Cards / Banks     │
└─────────────┘     └─────────────┘     └──────────────────┘
```

### ModemPay API Details

**Base URL**: `https://api.modempay.com`
**Docs**: `https://docs.modempay.com`
**Sandbox**: `https://sandbox.modempay.com`
**Dashboard**: `https://merchant.modempay.com`

**Key Endpoints**:

| Endpoint                   | Method | Description                               |
| -------------------------- | ------ | ----------------------------------------- |
| `/v1/payment-intents`      | POST   | Create a payment intent (collect payment) |
| `/v1/payment-intents/{id}` | GET    | Get payment status                        |
| `/v1/transfers`            | POST   | Initiate payout (send money)              |
| `/v1/transfers/{id}`       | GET    | Get transfer status                       |
| `/v1/balance`              | GET    | Get account balance                       |
| `/webhooks`                | POST   | Real-time event notifications             |

**Supported Networks**:

| Network         | Key             | Type         | Settlement |
| --------------- | --------------- | ------------ | ---------- |
| Wave            | `wave`          | Mobile Money | Instant    |
| Afrimoney       | `afrimoney`     | Mobile Money | Instant    |
| QMoney          | `qmoney`        | Mobile Money | Instant    |
| Visa/Mastercard | `card`          | Card         | Next-day   |
| Bank Transfer   | `bank_transfer` | Bank         | Next-day   |

### Code Example: Collect Payment

```typescript
import ModemPay from "modem-pay";

const modempay = new ModemPay(process.env.MODEMPAY_SECRET_KEY!);

// Collect a payment via Wave
const intent = await modempay.paymentIntents.create({
  amount: 2450,
  network: "wave",
  account_number: "7000001", // customer's Wave phone number
  metadata: {
    entity_id: entityId,
    invoice_id: invoiceId,
  },
});

// Handle webhook confirmation
app.post("/api/webhooks/modempay", async (req, res) => {
  const signature = req.headers["x-modempay-signature"];
  const event = modempay.webhooks.verify(req.body, signature);

  if (event.type === "payment_intent.succeeded") {
    // Record payment in ledger
    await recordMobileMoneyPayment({
      entityId: event.data.metadata.entity_id,
      reference: event.data.id,
      amount: event.data.amount,
      network: event.data.network,
      account_number: event.data.account_number,
      status: "completed",
    });
  }

  res.json({ received: true });
});
```

### Code Example: Send Payment (Payout)

```typescript
// Send money to a mobile wallet
const transfer = await modempay.transfers.initiate(
  {
    amount: 5000,
    currency: "GMD",
    network: "wave",
    account_number: "7834567",
    beneficiary_name: "Fatou Ndiaye",
    narration: "Vendor payment for April supplies",
    metadata: {
      entity_id: entityId,
      vendor_id: vendorId,
    },
  },
  `idempotency-${crypto.randomUUID()}`,
);

// transfer.status: "processing" → "completed" (via webhook)
```

### What We Integrate (MVP)

| Feature                     | MVP                       | Post-MVP                               |
| --------------------------- | ------------------------- | -------------------------------------- |
| Collect payments via Wave   | ✅ Via ModemPay           | ✅                                     |
| Collect via QMoney          | ✅ Via ModemPay           | ✅                                     |
| Collect via Afrimoney       | ✅ Via ModemPay           | ✅                                     |
| Send payments (payouts)     | ✅ Via ModemPay           | ✅                                     |
| Auto-reconcile via webhooks | ✅                        | ✅                                     |
| Statement import (manual)   | ✅ CSV upload + AI parser | ✅                                     |
| Bank transfers              | ✅ Via ModemPay (1.25%)   | ✅                                     |
| Card payments               | ✅ Via ModemPay (3.5%)    | ✅                                     |
| Bulk payouts                | ❌ Deferred               | Phase 2                                |
| GamSwitch integration       | ❌ Deferred               | Phase 2 — when BANTABA 2.0 APIs mature |
| M-Pesa (Kenya)              | ❌ Deferred               | Phase 2                                |

### GamSwitch (Future — Phase 2)

GamSwitch is The Gambia's national payment switch (BANTABA 2.0 launched Dec 2025). Built on Mojaloop, connects 152+ institutions, 99.76% uptime, GMD 9B+ annual transaction value.

**Why not MVP:**

- B2B/institutional API — requires onboarding as a connected institution
- Not self-service — requires CBG approval and integration agreement
- Settlement infrastructure, not merchant-facing
- GamSwitch is the _rails_, ModemPay is the _interface_

**When to integrate:**

- When we need direct bank-to-bank transfers at scale
- When we want to bypass aggregator fees for high-volume operations
- When GamSwitch exposes merchant-facing APIs (they have api.gamswitch.com but documentation is limited)

### Manual Statement Import (MVP Fallback)

For accounting visibility without live payment integration:

1. User downloads Wave transaction history from app (screenshots + SMS)
2. Or enters transactions manually via quick-entry form
3. Or uploads CSV in Wave-like format using the CSV parser
4. System reconciles manual entries against bank statement

---

## 7. Statement Import Formats

### Wave Statement Format

Wave does not offer downloadable CSV from the consumer app. Users can:

1. **View in-app**: Last 90 days of transactions
2. **SMS history**: Each transaction triggers an SMS
3. **Business Portal**: Business account holders can see transaction logs

Expected CSV format (when manually constructed or exported via Business Portal):

```csv
Date,Description,Type,Amount,Fees,Balance
2026-01-15,Payment from Fatou Ndiaye,Receive,+500.00,0.00,15000.00
2026-01-15,Send to Modou Sowe,Send,-200.00,-2.00,14500.00
2026-01-16,Cash-in at agent,CashIn,+1000.00,0.00,16000.00
2026-01-16,Cash-out at agent,CashOut,-500.00,0.00,15500.00
```

### QMoney / Afrimoney Statement Format

No public information on export formats. Expect similar CSV or PDF formats with columns: Date, Description, Type (Credit/Debit), Amount, Balance.

### General Statement Parser

The CSV parser in `docs/DATA_MIGRATION.md` is designed to handle these formats. Key considerations:

| Issue                      | Handling                                            |
| -------------------------- | --------------------------------------------------- |
| Transaction type indicator | Detect "Receive/Send", "Credit/Debit", "+/-" prefix |
| Fee column                 | Detect and separate from principal amount           |
| Currency symbol            | Strip GMD/D/XOF prefixes                            |
| Date format                | Normalize DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD        |
| Balance column             | Use for reconciliation, don't import as transaction |
| SMS/notification format    | Regex parsing (Phase 2)                             |

---

## 8. API Costs

### ModemPay Pricing (MVP Route)

| Service                                | Cost                  | Notes                        |
| -------------------------------------- | --------------------- | ---------------------------- |
| ModemPay API access                    | Free (self-service)   | No setup fee, no monthly fee |
| Mobile Money (Wave, Afrimoney, QMoney) | 1.5% per transaction  | Instant settlement           |
| Bank Transfer                          | 1.25% per transfer    | Next-day settlement          |
| Card Payments (Visa/Mastercard)        | 3.5% per transaction  | 3D Secure included           |
| Stablecoins (USDC/USDT)                | 1.0% on-ramp/off-ramp | Instant conversion           |
| Free between ModemPay users            | 0%                    | Internal transfers           |
| Bulk Payouts                           | 1.5%                  | Phase 2                      |
| Payouts (send money)                   | 1.5%                  | Same rate as collections     |

**Cost impact on Xenboox:**

- A 2,450 GMD mobile money payment costs ModemPay 36.75 GMD (1.5%)
- For a business processing 100 mobile money payments/month averaging 2,000 GMD: 3,000 GMD/month (~$42) in ModemPay fees
- This is a pass-through cost — Xenboox doesn't absorb it, the customer pays it to ModemPay directly
  | Monthly minimum | None reported | Self-service tier |

### Direct Wave API Pricing

| Service              | Cost                                   |
| -------------------- | -------------------------------------- |
| Merchant fee         | 1% per transaction (capped at GMD ~50) |
| Monthly subscription | $0                                     |
| Bank cash-out        | GMD 50 flat                            |
| API access           | $0 (included with merchant account)    |

### Estimated Cost Comparison (Per GMD 10,000 Transaction)

| Route                  | Fee                  | Notes                                         |
| ---------------------- | -------------------- | --------------------------------------------- |
| Direct Wave            | GMD 100 (1%)         | Requires Senegal-registered business to apply |
| Waychit (Wave via agg) | GMD 150-300 (1.5-3%) | Higher but no onboarding barrier              |
| Waychit (card)         | GMD 350-500 (3.5-5%) | Cards are more expensive                      |
| Manual import          | $0                   | No live payment integration                   |

### Break-Even Analysis

If Xenboox processes >GMD 500,000/month in Wave payments, the 1.5% Waychit premium costs >GMD 7,500/month extra over direct API. At that volume, it may justify the overhead of obtaining direct Wave API access.

---

## 9. Compliance

### Regulatory Framework

Mobile money in The Gambia is governed by:

1. **Central Bank of The Gambia Mobile Money Regulations (2011)**

   - Applicable to all payment service providers
   - Core capital requirement: GMD 10,000,000 for non-bank providers
   - Authorization required before commencing business
   - Consumer protection and risk management standards

2. **CBG List of Licensed Mobile Money Operators**
   - Wave Transfer Limited (Wave)
   - QMoney Financial Services Ltd (QCell)
   - Afrimobile Money (Africell)

### Compliance Requirements for Xenboox

| Requirement                        | Status                  | Action                                        |
| ---------------------------------- | ----------------------- | --------------------------------------------- |
| Payment service provider license   | ❌ Not held             | Xenboox is a platform, not a PSP              |
| Partnership with licensed operator | ✅ Required             | Waychit handles this                          |
| Data protection / privacy          | ⚠️ Must comply          | Ensure data processing agreements             |
| AML / KYC                          | ⚠️ Handled by providers | Waychit/Wave handle KYC for transactions      |
| Transaction record keeping         | ✅ Xenboox handles      | 7-year retention per CBG guidelines           |
| Cross-border data transfer         | ⚠️ Review required      | For entities with Senegalese parent companies |

### Key Compliance Decision

**Xenboox does not need to be a licensed mobile money operator.** As an accounting platform that integrates with licensed PSPs (Waychit, Wave), Xenboox is a technology service provider, not a payment institution. However:

- Data processing agreements must be in place with Waychit/Wave
- User financial data stored in Xenboox falls under GDPR-like protections
- CBG may classify aggregated transaction data as "payment processing" — legal review needed
- Recommend engaging Gambian fintech counsel before launch

---

## 10. Recommendation

### MVP in The Gambia: What's Actually Feasible

```
Feasibility Matrix — The Gambia Mobile Money Integration
══════════════════════════════════════════════════════════

Integration Method       Cost  Timeline  Maintain   Verdict
──────────────────────────────────────────────────────────
Waychit Aggregator      Low   1-2 wks   Low        ✅ DO THIS
Manual CSV Import       Zero  1-2 wks   Medium     ✅ DO THIS
Direct Wave Checkout    Low   4-8 wks   Medium     ⏳ DEFER
Direct Wave Payout      Med   8-12 wks  High       ❌ SKIP MVP
QMoney Direct           High  Unknown   High       ❌ SKIP
Afrimoney Direct        High  Unknown   High       ❌ SKIP
Orange Money            N/A   N/A       N/A        ❌ NOT IN GM
MTN MoMo                N/A   N/A       N/A        ❌ NOT IN GM
M-Pesa Daraja           N/A   N/A       N/A        ❌ NOT IN GM
Airtel Money            N/A   N/A       N/A        ❌ NOT IN GM
```

### MVP Integration Plan

```
Phase 1 (Weeks 1-2) — Waychit Payment Collection
├── Sign up for Waychit merchant account
├── Integrate Waychit hosted payment page
├── Implement webhook handler for payment.request.completed
├── Connect payment to invoice reconciliation
└── Test with GMD transactions in sandbox

Phase 1b (Weeks 1-2) — Manual Statement Import
├── Build CSV upload for Wave/QMoney statements
├── AI column mapping for non-standard formats
├── Transaction categorization (income, expense, transfer)
└── Bank reconciliation matching

Phase 2 (Weeks 3-6) — Enhanced Integration
├── Direct Wave Checkout API (if volume justifies)
├── Payment initiation from Xenboox invoices
├── Auto-reconciliation with bank statements
└── SMS/notification parsing for transaction capture

Phase 3 (Month 3+) — Expansion Markets
├── M-Pesa Daraja integration (Kenya expansion)
├── MTN MoMo (Uganda/Ghana)
├── Airtel Money (East Africa)
└── Orange Money (Senegal expansion)
```

### Summary

**For MVP**: Use Waychit as the payment aggregator (covers Wave, QMoney, Afrimoney in one integration) + manual CSV import with AI-assisted parsing for statement reconciliation. This gives full mobile money coverage without the 4-8 week onboarding delay of direct Wave API access.

**Direct Wave API**: Defer until either (a) processing volume exceeds GMD 500K/mo through Waychit, or (b) a Senegalese business entity is established to complete Wave's self-service onboarding.

**No other mobile money API is viable in The Gambia.** QMoney and Afrimoney do not have public APIs. Orange Money, MTN MoMo, M-Pesa, and Airtel Money do not operate in Gambia.

**For Phase 2 expansion**: Each new market (Kenya, Uganda, Senegal, Ghana) will require dedicated mobile money integration for the dominant provider(s) in that market. Plan for 2-4 weeks of integration work per market.
