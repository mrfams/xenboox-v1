import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type PaymentSentProps = {
  supplierName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  reference?: string;
  entityName: string;
};

export function PaymentSentEmail(props: PaymentSentProps) {
  return (
    <EmailLayout
      preview={`Payment of ${props.currency} ${props.amount} sent to ${props.supplierName}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Payment Sent ✓
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant="default">
        <Text className="text-[15px] font-bold text-[#0F172A] m-0">
          {props.currency} {props.amount} → {props.supplierName}
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Supplier" value={props.supplierName} />
        <Divider />
        <DataRow label="Invoice" value={props.invoiceNumber} />
        <Divider />
        <DataRow label="Amount" value={`${props.currency} ${props.amount}`} bold />
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

PaymentSentEmail.PreviewProps = {
  supplierName: "Global Supplies Ltd",
  invoiceNumber: "BILL-2026-042",
  amount: "3,200.00",
  currency: "USD",
  paymentMethod: "Bank Transfer",
  reference: "PAY-98765",
  entityName: "Xenboox Demo",
} satisfies PaymentSentProps;
