import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type PaymentReceivedProps = {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  reference?: string;
  entityName: string;
};

export function PaymentReceivedEmail(props: PaymentReceivedProps) {
  return (
    <EmailLayout
      preview={`Payment of ${props.currency} ${props.amount} received for ${props.invoiceNumber}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Payment Received ✓
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant="success">
        <Text className="text-[15px] font-bold text-[#16A34A] m-0">
          {props.currency} {props.amount}
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Customer" value={props.customerName} />
        <Divider />
        <DataRow label="Invoice" value={props.invoiceNumber} />
        <Divider />
        <DataRow label="Amount" value={`${props.currency} ${props.amount}`} bold color="text-[#16A34A]" />
        <Divider />
        <DataRow label="Method" value={props.paymentMethod} />
        {props.reference && (
          <>
            <Divider />
            <DataRow label="Reference" value={props.reference} />
          </>
        )}
      </div>

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        This payment has been recorded in your books automatically.
      </Text>
    </EmailLayout>
  );
}

PaymentReceivedEmail.PreviewProps = {
  customerName: "Acme Corp",
  invoiceNumber: "INV-2026-001",
  amount: "1,500.00",
  currency: "USD",
  paymentMethod: "Bank Transfer",
  reference: "TXN-12345",
  entityName: "Xenboox Demo",
} satisfies PaymentReceivedProps;
