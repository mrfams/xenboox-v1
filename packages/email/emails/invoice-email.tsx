import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider } from "./_layout";

type InvoiceEmailProps = {
  customerName: string;
  invoiceNumber: string;
  totalAmount: string;
  currency: string;
  dueDate: string;
  entityName: string;
  /** URL to the customer-facing invoice portal */
  invoiceUrl?: string;
};

export function InvoiceEmail(props: InvoiceEmailProps) {
  return (
    <EmailLayout
      preview={`Invoice ${props.invoiceNumber} — ${props.totalAmount} due ${props.dueDate}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Invoice {props.invoiceNumber}
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Dear {props.customerName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        Please find attached invoice <strong>{props.invoiceNumber}</strong> for
        the amount of <strong>{props.totalAmount}</strong>. Payment is due by{" "}
        <strong>{props.dueDate}</strong>.
      </Text>

      {/* Summary card */}
      <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-6 mb-6">
        <Text className="text-[13px] text-[#64748B] uppercase tracking-wider m-0 mb-3">
          Invoice Summary
        </Text>
        <DataRow label="Invoice #" value={props.invoiceNumber} />
        <Divider />
        <DataRow label="Amount Due" value={props.totalAmount} bold />
        <Divider />
        <DataRow label="Due Date" value={props.dueDate} />
        <Divider />
        <DataRow label="From" value={props.entityName} />
      </div>

      <Text className="text-[13px] text-[#64748B] m-0 mb-6">
        Please remit payment by the due date. If you have any questions about
        this invoice, don't hesitate to reach out.
      </Text>

      <Text className="text-[13px] text-[#94A3B8] m-0 text-center">
        Thank you for your business!
      </Text>
    </EmailLayout>
  );
}

InvoiceEmail.PreviewProps = {
  customerName: "Acme Corp",
  invoiceNumber: "INV-2026-001",
  totalAmount: "$2,500.00",
  currency: "USD",
  dueDate: "August 15, 2026",
  entityName: "Xenboox Demo",
  invoiceUrl: "https://pay.xenboox.com/inv_abc123",
} satisfies InvoiceEmailProps;
