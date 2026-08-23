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

type Day7EmailProps = {
  userName: string;
  dashboardUrl: string;
};

export function OnboardingDay7Email(props: Day7EmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              Ready for the next level?
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>
            <Text className="text-gray-700 leading-relaxed mb-4">
              You've been using Xenboox for a week. By now, the AI has learned
              your transaction patterns and is categorizing most entries
              automatically. Here are 3 features that will save you even more
              time:
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Section className="mb-4">
                <Text className="font-semibold text-gray-900 m-0">
                  1. Invoicing with AI
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Create invoices in seconds. The AI suggests line items based
                  on your history, generates professional PDFs, and sends them
                  with payment links. When the customer pays, the entry is
                  posted automatically.
                </Text>
                <Link
                  href={`${props.dashboardUrl}/operations/invoices`}
                  className="text-indigo-600 text-sm font-medium"
                >
                  Try it →
                </Link>
              </Section>
              <Section className="mb-4">
                <Text className="font-semibold text-gray-900 m-0">
                  2. Month-End Close
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  The AI runs your month-end close checklist — reconciliation,
                  accruals, adjustments — and presents you with a summary. You
                  review and approve. What used to take 3 weeks now takes 4
                  days.
                </Text>
                <Link
                  href={`${props.dashboardUrl}/ledger`}
                  className="text-indigo-600 text-sm font-medium"
                >
                  See your ledger →
                </Link>
              </Section>
              <Section>
                <Text className="font-semibold text-gray-900 m-0">
                  3. Cash Flow Forecast
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  The AI predicts your cash position 30-90 days out. Know before
                  you're short. Plan hires, purchases, and investments with
                  confidence.
                </Text>
                <Link
                  href={`${props.dashboardUrl}/financial-pulse`}
                  className="text-indigo-600 text-sm font-medium"
                >
                  View forecast →
                </Link>
              </Section>
            </Section>

            <Section className="text-center mb-6">
              <Link
                href={props.dashboardUrl}
                className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
              >
                Explore Your Dashboard →
              </Link>
            </Section>

            <Text className="text-gray-600 text-sm leading-relaxed">
              <strong>Pro tip:</strong> Ask the AI anything in the Command
              Center. Try: "Show me a P&L for last month" or "What's my biggest
              expense category?" — it responds in plain English.
            </Text>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              You're saving ~{10} hours/month with Xenboox. That's time back for
              growing your business.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingDay7Email.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
} satisfies Day7EmailProps;
