// ─── OpenAPI 3.1 Specification for Xenboox REST API v1 ────────────────────
//
// Serves the OpenAPI spec as JSON at GET /api/v1/openapi.
// Use with Swagger UI, Redoc, or any OpenAPI-compatible tool.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Xenboox REST API",
    version: "1.0.0",
    description:
      "Enterprise accounting API for Xenboox. Provides programmatic access to financial data, journal entries, invoices, bills, customers, suppliers, bank accounts, and reports.\n\nAll endpoints require an API key passed via the `x-api-key` header. Keys are scoped to specific entities and roles — API access follows the exact same RBAC model as the web dashboard.",
    contact: {
      name: "Xenboox API Support",
      email: "api@xenboox.com",
    },
    license: {
      name: "Proprietary",
      url: "https://xenboox.vercel.app/terms",
    },
  },
  servers: [
    {
      url: "https://xenboox.vercel.app",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Development",
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "Your Xenboox API key (format: xb_xxx...xxx). Generate from Settings → API Keys in the dashboard.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "boolean", example: true },
          message: { type: "string" },
          documentation: { type: "string", format: "uri" },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          entityId: { type: "string", format: "uuid" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      JournalEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          entryNumber: { type: "string" },
          date: { type: "string", format: "date" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["draft", "posted", "reversed"],
          },
          debitTotal: { type: "number" },
          creditTotal: { type: "number" },
          currency: { type: "string" },
          lines: {
            type: "array",
            items: { $ref: "#/components/schemas/JournalEntryLine" },
          },
        },
      },
      JournalEntryLine: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          accountId: { type: "string", format: "uuid" },
          debit: { type: "number" },
          credit: { type: "number" },
          description: { type: "string" },
        },
      },
      Account: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string" },
          name: { type: "string" },
          type: {
            type: "string",
            enum: ["asset", "liability", "equity", "revenue", "expense"],
          },
          subtype: { type: "string" },
          isActive: { type: "boolean" },
          balance: { type: "number" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          invoiceNumber: { type: "string" },
          customerId: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["draft", "sent", "paid", "overdue", "void"],
          },
          total: { type: "number" },
          currency: { type: "string" },
          dueDate: { type: "string", format: "date" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Bill: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          billNumber: { type: "string" },
          supplierId: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["draft", "pending_approval", "approved", "paid", "overdue"],
          },
          total: { type: "number" },
          currency: { type: "string" },
          dueDate: { type: "string", format: "date" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          currency: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Supplier: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          currency: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      BankAccount: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          accountName: { type: "string" },
          bankName: { type: "string" },
          accountNumber: { type: "string" },
          currency: { type: "string" },
          balance: { type: "number" },
          isActive: { type: "boolean" },
        },
      },
      BankTransaction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          entityId: { type: "string", format: "uuid" },
          bankAccountId: { type: "string", format: "uuid" },
          transactionDate: { type: "string", format: "date" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["credit", "debit"] },
          reconciled: { type: "boolean" },
        },
      },
      TrialBalance: {
        type: "object",
        properties: {
          type: { type: "string", example: "trial-balance" },
          accounts: { type: "integer" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Account" },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/transactions": {
      get: {
        tags: ["Journal Entries"],
        summary: "List journal entries",
        description:
          "Returns paginated journal entries for the authenticated entity. Each entry includes its double-entry lines.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 25, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "List of journal entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/JournalEntry" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid or missing API key" },
          "403": { description: "Key lacks read access" },
          "429": { description: "Rate limit exceeded" },
        },
      },
      post: {
        tags: ["Journal Entries"],
        summary: "Create a journal entry",
        description:
          "Submits a journal entry for processing through the agent review chain (Ledger Agent → Controller Agent). The entry is validated for double-entry integrity before posting.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date", "description", "lines"],
                properties: {
                  date: { type: "string", format: "date" },
                  description: { type: "string" },
                  lines: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      required: ["accountId"],
                      properties: {
                        accountId: { type: "string", format: "uuid" },
                        debit: { type: "number", minimum: 0 },
                        credit: { type: "number", minimum: 0 },
                        description: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Entry queued for agent review",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid request body" },
          "401": { description: "Invalid or missing API key" },
          "403": { description: "Key lacks write access" },
        },
      },
    },
    "/api/v1/accounts": {
      get: {
        tags: ["Chart of Accounts"],
        summary: "List accounts",
        description:
          "Returns the chart of accounts for the authenticated entity.",
        responses: {
          "200": {
            description: "List of accounts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Account" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/accounts/balances": {
      get: {
        tags: ["Chart of Accounts"],
        summary: "List account balances",
        description:
          "Returns active accounts with their current balances for the authenticated entity.",
        responses: {
          "200": {
            description: "List of account balances",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Account" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/invoices": {
      get: {
        tags: ["Accounts Receivable"],
        summary: "List sales invoices",
        description:
          "Returns sales invoices for the authenticated entity. Filter by status.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["draft", "sent", "paid", "overdue", "void"],
            },
          },
        ],
        responses: {
          "200": {
            description: "List of invoices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Invoice" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Accounts Receivable"],
        summary: "Create a sales invoice",
        description:
          "Submits a sales invoice for processing through the AR Agent review chain.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["customerId", "items"],
                properties: {
                  customerId: { type: "string", format: "uuid" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unitPrice: { type: "number" },
                      },
                    },
                  },
                  currency: { type: "string" },
                  dueDate: { type: "string", format: "date" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "202": { description: "Invoice queued for agent review" },
        },
      },
    },
    "/api/v1/bills": {
      get: {
        tags: ["Accounts Payable"],
        summary: "List bills (AP invoices)",
        description:
          "Returns accounts payable invoices for the authenticated entity.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "draft",
                "pending_approval",
                "approved",
                "paid",
                "overdue",
              ],
            },
          },
        ],
        responses: {
          "200": {
            description: "List of bills",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Bill" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/customers": {
      get: {
        tags: ["Accounts Receivable"],
        summary: "List customers",
        description: "Returns the customer list for the authenticated entity.",
        responses: {
          "200": {
            description: "List of customers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Customer" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/suppliers": {
      get: {
        tags: ["Accounts Payable"],
        summary: "List suppliers",
        description: "Returns the supplier list for the authenticated entity.",
        responses: {
          "200": {
            description: "List of suppliers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Supplier" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/bank": {
      get: {
        tags: ["Banking"],
        summary: "List bank accounts",
        description: "Returns bank accounts for the authenticated entity.",
        responses: {
          "200": {
            description: "List of bank accounts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BankAccount" },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/bank-transactions": {
      get: {
        tags: ["Banking"],
        summary: "List bank transactions",
        description:
          "Returns paginated bank transactions for the authenticated entity.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 25, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "List of bank transactions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/BankTransaction",
                      },
                    },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/reports/trial-balance": {
      get: {
        tags: ["Reports"],
        summary: "Get trial balance",
        description: "Returns the trial balance for the authenticated entity.",
        parameters: [
          {
            name: "period",
            in: "query",
            schema: { type: "string" },
            description: "Fiscal period ID",
          },
        ],
        responses: {
          "200": {
            description: "Trial balance report",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/TrialBalance" },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Journal Entries", description: "Double-entry journal entries" },
    {
      name: "Chart of Accounts",
      description: "Account structure and balances",
    },
    {
      name: "Accounts Receivable",
      description: "Sales invoices and customers",
    },
    { name: "Accounts Payable", description: "Bills and suppliers" },
    { name: "Banking", description: "Bank accounts and transactions" },
    { name: "Reports", description: "Financial reports" },
  ],
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
