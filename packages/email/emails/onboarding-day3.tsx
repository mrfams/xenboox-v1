import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Tailwind,
  Link,
} from "@react-email/components";

type Day3EmailProps = {
  userName: string;
  dashboardUrl: string;
  transactionsProcessed: number;
  timeSavedMinutes: number;
};

export function OnboardingDay3Email(props: Day3EmailProps) {
  const hasData = props.transactionsProcessed > 0;

  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              {hasData
                ? `Your AI has processed ${props.transactionsProcessed} transactions`
                : "Have you seen your first AI insight?"}
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>

            {hasData ? (
              <>
                <Text className="text-gray-700 leading-relaxed mb-4">
                  In just 3 days, your AI accounting team has already saved you
                  approximately{" "}
                  <strong>{props.timeSavedMinutes} minutes</strong> of manual
                  data entry.
                </Text>
                <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      {props.transactionsProcessed} transactions
                      auto-categorized
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      The AI learned your spending patterns and categorized them
                      automatically.
                    </Text>
                  </Section>
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      {props.timeSavedMinutes} minutes saved
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Time you would have spent on manual data entry.
                    </Text>
                  </Section>
                  <Section>
                    <Text className="font-semibold text-gray-900 m-0">
                      Zero errors caught
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      The AI flagged any unusual transactions for your review.
                    </Text>
                  </Section>
                </Section>
                <Section className="text-center mb-6">
                  <Link
                    href={`${props.dashboardUrl}/financial-pulse`}
                    className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
                  >
                    View Your Insights →
                  </Link>
                </Section>
              </>
            ) : (
              <>
                <Text className="text-gray-700 leading-relaxed mb-4">
                  You signed up 3 days ago but haven't connected your bank yet.
                  Here's what you're missing:
                </Text>
                <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      ⚡ Auto-categorization
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      The AI can categorize hundreds of transactions in seconds.
                    </Text>
                  </Section>
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      📊 Real-time reports
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      See your P&L, balance sheet, and cash flow — always up to
                      date.
                    </Text>
                  </Section>
                  <Section>
                    <Text className="font-semibold text-gray-900 m-0">
                      🔔 Anomaly alerts
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Get notified about unusual spending before it becomes a
                      problem.
                    </Text>
                  </Section>
                </Section>
                <Section className="text-center mb-6">
                  <Link
                    href={`${props.dashboardUrl}/operations`}
                    className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
                  >
                    Connect Your Bank (1 min) →
                  </Link>
                </Section>
              </>
            )}

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              Built for businesses in The Gambia. AI-powered, human-approved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingDay3Email.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
  transactionsProcessed: 47,
  timeSavedMinutes: 25,
} satisfies Day3EmailProps;
