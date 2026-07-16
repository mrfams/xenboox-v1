import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Tailwind,
} from "@react-email/components"

type DocumentUploadedProps = {
  entityName: string
  documentName: string
  documentType: string
  uploadUrl: string
}

export function DocumentUploadedEmail(props: DocumentUploadedProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Document Uploaded
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName}
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Document Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Name</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.documentName}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Type</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.documentType}</Text>
                </div>
              </div>
            </Section>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

DocumentUploadedEmail.PreviewProps = {
  entityName: "Acme Corp",
  documentName: "Invoice-001.pdf",
  documentType: "invoice",
  uploadUrl: "https://app.xenboox.com/documents/abc123",
} satisfies DocumentUploadedProps