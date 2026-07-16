import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Tailwind,
} from "@react-email/components"

type PaymentReceivedProps = {
  customerName: string
  invoiceNumber: string
  amount: string
  currency: string
  paymentMethod: string
  reference?: string
  entityName: string
}

export function PaymentReceivedEmail(props: PaymentReceivedProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Payment Received
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName}
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Payment Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Customer</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.customerName}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Invoice</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.invoiceNumber}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Amount</Text>
                  <Text className="font-bold text-green-600 m-0">{props.currency} {props.amount}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Method</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.paymentMethod}</Text>
                </div>
                {props.reference && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600 m-0">Reference</Text>
                    <Text className="font-semibold text-gray-900 m-0">{props.reference}</Text>
                  </div>
                )}
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

PaymentReceivedEmail.PreviewProps = {
  customerName: "Acme Corp",
  invoiceNumber: "INV-2026-001",
  amount: "1,500.00",
  currency: "GMD",
  paymentMethod: "bank_transfer",
  reference: "TXN-12345",
  entityName: "Xenboox Demo",
} satisfies PaymentReceivedProps
