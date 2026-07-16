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

type DigestItem = {
  type: string
  count: number
  items: Array<{ title: string; body: string }>
}

type DailyDigestProps = {
  userName: string
  items: DigestItem[]
}

export function DailyDigestEmail(props: DailyDigestProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Your Daily Digest
            </Heading>
            <Text className="text-gray-600 mb-6">
              Hi {props.userName}, here's what happened yesterday:
            </Text>

            {props.items.map((group) => (
              <Section key={group.type} className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
                <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                  {group.type.replace(/_/g, " ")} ({group.count})
                </Heading>
                {group.items.map((item, i) => (
                  <Section key={i} className="mb-3 last:mb-0">
                    <Text className="font-semibold text-gray-900 m-0">{item.title}</Text>
                    <Text className="text-gray-600 text-sm m-0">{item.body}</Text>
                  </Section>
                ))}
              </Section>
            ))}

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This digest was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

DailyDigestEmail.PreviewProps = {
  userName: "John",
  items: [
    {
      type: "overdue_invoice",
      count: 2,
      items: [
        { title: "INV-2026-0042 — $12,500", body: "27 days overdue" },
        { title: "INV-2026-0039 — $8,200", body: "14 days overdue" },
      ],
    },
    {
      type: "report_ready",
      count: 1,
      items: [{ title: "P&L Report — June 2026", body: "Your monthly P&L is ready" }],
    },
  ],
} satisfies DailyDigestProps
