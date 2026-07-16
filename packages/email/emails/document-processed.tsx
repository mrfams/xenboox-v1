import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Tailwind,
} from "@react-email/components"

type DocumentProcessedProps = {
  entityName: string
  documentName: string
  status: string
  extractedText?: string
}

export function DocumentProcessedEmail(props: DocumentProcessedProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Document Processed
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
                  <Text className="text-gray-600 m-0">Status</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.status}</Text>
                </div>
              </div>
            </Section>

            {props.extractedText && (
              <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                  Extracted Text
                </Heading>
                <Text className="text-gray-600 text-sm whitespace-pre-wrap">
                  {props.extractedText}
                </Text>
              </Section>
            )}

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

DocumentProcessedEmail.PreviewProps = {
  entityName: "Acme Corp",
  documentName: "Invoice-001.pdf",
  status: "processed",
  extractedText: "Invoice number: INV-001\nDate: 2026-06-15\nAmount: $5,000.00",
} satisfies DocumentProcessedProps