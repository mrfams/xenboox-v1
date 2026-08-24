# Floating-Point Money Handling

> Ensuring accurate monetary calculations in Xenboox.

---

## The Problem

Floating-point numbers (JavaScript `number` type) cannot precisely represent decimal values like $19.99. This causes:

- Rounding errors in calculations
- Display mismatches (0.1 + 0.2 ≠ 0.3)
- Financial reporting inaccuracies

---

## Solution: Integer Cents

Store all monetary values as **integer cents** (or smallest currency unit).

| Display      | Stored |
| ------------ | ------ |
| $19.99       | 1999   |
| GMD 5,000.00 | 500000 |
| €123.45      | 12345  |

### Conversion

```typescript
// Dollars to cents
const cents = Math.round(dollars * 100);

// Cents to dollars
const dollars = cents / 100;
```

---

## Database Schema

```typescript
// Drizzle schema
amount: integer("amount").notNull(), // stored as cents
currency: text("currency").notNull(), // USD, GMD, EUR
```

---

## Display

```typescript
function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
```

---

## Validation

```typescript
const moneySchema = z.number().int().min(0).max(100_000_000); // $100K max
```

---

_Last updated: August 2026_
