/**
 * Zod Error Message Wrapper
 *
 * Maps developer-facing Zod error messages to user-friendly messages.
 * Use this to display readable error messages in the UI.
 */

type ZodFieldErrors = Record<string, string[] | undefined>;

const FIELD_LABELS: Record<string, string> = {
  email: "Email address",
  password: "Password",
  name: "Name",
  title: "Title",
  description: "Description",
  amount: "Amount",
  date: "Date",
  dueDate: "Due date",
  invoiceNumber: "Invoice number",
  customerId: "Customer",
  vendorId: "Vendor",
  accountId: "Account",
  category: "Category",
  status: "Status",
  phone: "Phone number",
  address: "Address",
  city: "City",
  country: "Country",
  currency: "Currency",
  taxRate: "Tax rate",
  quantity: "Quantity",
  unitPrice: "Unit price",
};

const ERROR_MESSAGES: Record<string, string> = {
  required: "is required",
  invalid_type: "is not valid",
  too_small: "is too small",
  too_big: "is too big",
  invalid_string: "is not valid",
  invalid_enum_value: "is not a valid option",
  invalid_email: "is not a valid email address",
  invalid_url: "is not a valid URL",
  min_length: "is too short",
  max_length: "is too long",
};

/**
 * Convert Zod field errors to user-friendly messages.
 *
 * @example
 * const errors = formatZodErrors(error.flatten().fieldErrors);
 * // { email: "Email address is not a valid email address" }
 */
export function formatZodErrors(
  fieldErrors: ZodFieldErrors,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue;

    const label = FIELD_LABELS[field] ?? formatFieldName(field);
    const message = messages[0]; // Take first error

    // Map common Zod messages to user-friendly ones
    if (message === "Required") {
      result[field] = `${label} is required`;
    } else if (message.includes("Invalid email")) {
      result[field] = `${label} is not a valid email address`;
    } else if (message.includes("Too small")) {
      result[field] = `${label} is too small`;
    } else if (message.includes("Too big")) {
      result[field] = `${label} is too large`;
    } else if (message.includes("Invalid")) {
      result[field] = `${label} is not valid`;
    } else {
      result[field] = `${label} ${message}`;
    }
  }

  return result;
}

/**
 * Get a single user-friendly error message from a Zod error.
 */
export function getZodErrorMessage(
  fieldErrors: ZodFieldErrors,
  field: string,
): string | undefined {
  const formatted = formatZodErrors(fieldErrors);
  return formatted[field];
}

/**
 * Convert camelCase/snake_case field name to readable label.
 */
function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
