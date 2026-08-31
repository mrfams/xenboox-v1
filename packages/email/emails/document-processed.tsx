import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type DocumentProcessedProps = {
  entityName: string;
  documentName: string;
  status: string;
  extractedText?: string;
};

export function DocumentProcessedEmail(props: DocumentProcessedProps) {
  const isSuccess = props.status === "processed" || props.status === "posted";

  return (
    <EmailLayout
      preview={`Document ${isSuccess ? "processed" : "needs attention"}: ${props.documentName}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Document {isSuccess ? "Processed ✓" : "Needs Attention ⚠️"}
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant={isSuccess ? "success" : "warning"}>
        <Text
          className={`text-[14px] m-0 ${isSuccess ? "text-[#16A34A]" : "text-[#D97706]"}`}
        >
          {isSuccess
            ? "The document has been processed and posted to your books."
            : "The document couldn't be fully processed. Please review."}
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Document" value={props.documentName} />
        <Divider />
        <DataRow label="Status" value={props.status} />
        {props.extractedText && (
          <>
            <Divider />
            <DataRow label="Extracted" value={props.extractedText} />
          </>
        )}
      </div>
    </EmailLayout>
  );
}

DocumentProcessedEmail.PreviewProps = {
  entityName: "Acme Corp",
  documentName: "receipt-june-2026.pdf",
  status: "processed",
  extractedText: "Office supplies — $245.00",
} satisfies DocumentProcessedProps;
