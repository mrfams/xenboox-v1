import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, CTAButton, InfoBox } from "./_layout";

type InvoiceOverdueProps = {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
  invoiceUrl: string;
};

export function InvoiceOverdueEmail(props: InvoiceOverdueProps) {
  return (
    <EmailLayout
      preview={`Invoice ${props.invoiceNumber} is ${props.daysOverdue} days overdue`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Invoice Overdue ⚠️
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        Payment is past due and requires attention.
      </Text>

      <InfoBox variant="danger">
        <Text className="text-[14px] text-[#DC2626] m-0">
          {props.daysOverdue} days overdue
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Customer" value={props.customerName} />
        <Divider />
        <DataRow label="Invoice" value={props.invoiceNumber} />
        <Divider />
        <DataRow label="Amount" value={props.amount} bold color="text-[#DC2626]" />
        <Divider />
        <DataRow label="Due Date" value={props.dueDate} />
      </div>

      <CTAButton href={props.invoiceUrl} label="View Invoice" variant="danger" />

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        Consider sending a payment reminder or following up with the customer.
      </Text>
    </EmailLayout>
  );
}

InvoiceOverdueEmail.PreviewProps = {
  customerName: "Acme Corp",
  invoiceNumber: "INV-2026-001",
  amount: "$2,500.00",
  dueDate: "June 15, 2026",
  daysOverdue: 14,
  invoiceUrl: "https://app.xenboox.com/invoices/inv_123",
} satisfies InvoiceOverdueProps;
