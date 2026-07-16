import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Tailwind,
} from "@react-email/components"

type InvoiceOverdueProps = {
  customerName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  daysOverdue: number
  invoiceUrl: string
}

export function InvoiceOverdueEmail(props: InvoiceOverdueProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-red-600 mb-4">
              Invoice Overdue
            </Heading>
            <Text className="text-gray-600 mb-6">
              Payment for invoice <strong>{props.invoiceNumber}</strong> from {props.customerName} is overdue.
            </Text>

            <Section className="bg-white rounded-lg border border-red-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Invoice Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Customer</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.customerName}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Invoice Number</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.invoiceNumber}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Amount Due</Text>
                  <Text className="font-bold text-red-600 m-0">{props.amount}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Due Date</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.dueDate}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Days Overdue</Text>
                  <Text className="font-bold text-red-600 m-0">{props.daysOverdue} days</Text>
                </div>
              </div>
            </Section>

            <Button
              href={props.invoiceUrl}
              className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
            >
              View Invoice & Send Reminder
            </Button>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

InvoiceOverdueEmail.PreviewProps = {
  customerName: "Gambia Fisheries Ltd",
  invoiceNumber: "INV-2026-0042",
  amount: "$12,500.00",
  dueDate: "June 15, 2026",
  daysOverdue: 27,
  invoiceUrl: "https://app.xenboox.com/ar/invoices/inv-042",
} satisfies InvoiceOverdueProps
