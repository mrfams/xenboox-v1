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

type Day30EmailProps = {
  userName: string;
  dashboardUrl: string;
  transactionsCategorized: number;
  timeSavedHours: number;
};

export function OnboardingDay30Email(props: Day30EmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              You're becoming a power user! 🎉
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>
            <Text className="text-gray-700 leading-relaxed mb-4">
              It's been 30 days. Here's what you've accomplished with Xenboox:
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  {props.transactionsCategorized} transactions processed
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  All auto-categorized by AI. Zero manual data entry.
                </Text>
              </Section>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  {props.timeSavedHours}+ hours saved
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Time you would have spent on bookkeeping. That's a full
                  workday back.
                </Text>
              </Section>
              <Section>
                <Text className="font-semibold text-gray-900 m-0">
                  1 month of audit-ready books
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Every transaction has an audit trail. Every journal entry is
                  balanced. Your books are always production-ready.
                </Text>
              </Section>
            </Section>

            <Text className="text-gray-700 leading-relaxed mb-4">
              Now that you're settled in, here are 3 things that will take your
              accounting to the next level:
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  1. Invite your team
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Add your accountant or bookkeeper. They get real-time access
                  to the same data — no more "send me the spreadsheet" emails.
                </Text>
              </Section>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  2. Set up auto-approval rules
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Tell the AI: "Transactions under GMD 5,000 from known vendors
                  — auto-approve." Less reviewing, more growing.
                </Text>
              </Section>
              <Section>
                <Text className="font-semibold text-gray-900 m-0">
                  3. Connect mobile money
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  If you use Africell Money or QCell Tu Money, connect them for
                  real-time tracking. The AI handles the reconciliation.
                </Text>
              </Section>
            </Section>

            <Section className="text-center mb-6">
              <Link
                href={props.dashboardUrl}
                className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
              >
                Continue Building →
              </Link>
            </Section>

            <Text className="text-gray-600 text-sm leading-relaxed">
              <strong>What's next:</strong> You'll continue receiving your daily
              digest email with a summary of what the AI did overnight. Plus,
              monthly financial reports delivered straight to your inbox.
            </Text>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              Thank you for choosing Xenboox. We're building the future of
              accounting for businesses in The Gambia.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingDay30Email.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
  transactionsCategorized: 312,
  timeSavedHours: 10,
} satisfies Day30EmailProps;
