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

type Day14EmailProps = {
  userName: string;
  dashboardUrl: string;
  transactionsCategorized: number;
  reportsGenerated: number;
};

export function OnboardingDay14Email(props: Day14EmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              How's Xenboox working for you?
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>
            <Text className="text-gray-700 leading-relaxed mb-4">
              It's been 2 weeks. Here's what your AI accounting team has
              accomplished:
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  {props.transactionsCategorized} transactions categorized
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  All sorted into your chart of accounts automatically.
                </Text>
              </Section>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  {props.reportsGenerated} reports generated
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  P&L, balance sheet, cash flow — always up to date.
                </Text>
              </Section>
              <Section>
                <Text className="font-semibold text-gray-900 m-0">
                  0 manual entries required
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  The AI handles it. You just approve.
                </Text>
              </Section>
            </Section>

            <Text className="text-gray-700 leading-relaxed mb-4">
              We'd love to hear how it's going. Your feedback helps us build a
              better product for businesses like yours.
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Text className="font-semibold text-gray-900 m-0 mb-2">
                Quick questions:
              </Text>
              <Section className="mb-2">
                <Text className="text-gray-600 text-sm m-0">
                  • What's the most useful feature so far?
                </Text>
              </Section>
              <Section className="mb-2">
                <Text className="text-gray-600 text-sm m-0">
                  • What's been confusing or frustrating?
                </Text>
              </Section>
              <Section>
                <Text className="text-gray-600 text-sm m-0">
                  • What feature would make Xenboox indispensable?
                </Text>
              </Section>
            </Section>

            <Section className="text-center mb-6">
              <Link
                href="mailto:hello@xenboox.com?subject=My Xenboox experience"
                className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
              >
                Share Your Feedback →
              </Link>
            </Section>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              Your feedback shapes the future of AI accounting in The Gambia.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingDay14Email.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
  transactionsCategorized: 156,
  reportsGenerated: 4,
} satisfies Day14EmailProps;
