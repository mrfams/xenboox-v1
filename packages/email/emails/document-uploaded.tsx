import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type DocumentUploadedProps = {
  entityName: string;
  documentName: string;
  documentType: string;
  uploadUrl: string;
};

export function DocumentUploadedEmail(props: DocumentUploadedProps) {
  return (
    <EmailLayout
      preview={`Document uploaded: ${props.documentName}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Document Uploaded 📄
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant="default">
        <Text className="text-[14px] text-[#0F172A] m-0">
          Your document is being processed by our AI. You'll receive a
          notification when it's ready.
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Document" value={props.documentName} />
        <Divider />
        <DataRow label="Type" value={props.documentType} />
      </div>

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        AI processing typically takes 1-2 minutes.
      </Text>
    </EmailLayout>
  );
}

DocumentUploadedEmail.PreviewProps = {
  entityName: "Acme Corp",
  documentName: "receipt-june-2026.pdf",
  documentType: "Receipt",
  uploadUrl: "https://app.xenboox.com/ingestion",
} satisfies DocumentUploadedProps;
