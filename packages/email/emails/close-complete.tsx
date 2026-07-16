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

type CloseCompleteProps = {
  entityName: string
  month: string
  year: number
  reportUrl: string
  summary: {
    revenue: string
    expenses: string
    netIncome: string
    totalAssets: string
  }
}

export function CloseCompleteEmail(props: CloseCompleteProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Month-End Close Complete
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName} — {props.month} {props.year}
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Financial Summary
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Revenue</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.summary.revenue}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Expenses</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.summary.expenses}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Net Income</Text>
                  <Text className="font-bold text-gray-900 m-0">{props.summary.netIncome}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Total Assets</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.summary.totalAssets}</Text>
                </div>
              </div>
            </Section>

            <Button
              href={props.reportUrl}
              className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
            >
              View Full Report
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

CloseCompleteEmail.PreviewProps = {
  entityName: "Acme Corp",
  month: "June",
  year: 2026,
  reportUrl: "https://app.xenboox.com/reports/monthly/2026-06",
  summary: {
    revenue: "$125,000.00",
    expenses: "$89,500.00",
    netIncome: "$35,500.00",
    totalAssets: "$450,000.00",
  },
} satisfies CloseCompleteProps
