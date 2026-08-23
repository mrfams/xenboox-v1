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

type WelcomeEmailProps = {
  userName: string;
  dashboardUrl: string;
};

export function OnboardingWelcomeEmail(props: WelcomeEmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Xenboox! 👋
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>
            <Text className="text-gray-700 leading-relaxed mb-4">
              You've just joined the AI-native accounting platform built for
              businesses like yours. No more spreadsheets. No more manual data
              entry. No more month-end stress.
            </Text>
            <Text className="text-gray-700 leading-relaxed mb-6">
              <strong>19 AI agents</strong> are ready to handle your invoicing,
              payroll, reconciliation, and month-end close. You just approve the
              decisions that matter.
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading
                as="h2"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Here's what to do first:
              </Heading>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  1. Set up your organization (2 min)
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Tell us about your business — name, country, currency. The AI
                  uses this to configure your chart of accounts.
                </Text>
              </Section>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  2. Connect your bank (1 min)
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Link your bank account or mobile money. The AI will
                  automatically import and categorize your transactions.
                </Text>
              </Section>
              <Section className="mb-3">
                <Text className="font-semibold text-gray-900 m-0">
                  3. See the AI in action (instant)
                </Text>
                <Text className="text-gray-600 text-sm m-0">
                  Once connected, watch as your transactions are categorized
                  automatically. Review and approve — that's it.
                </Text>
              </Section>
            </Section>

            <Section className="text-center mb-6">
              <Link
                href={props.dashboardUrl}
                className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
              >
                Go to Dashboard →
              </Link>
            </Section>

            <Text className="text-gray-600 text-sm leading-relaxed mb-4">
              <strong>Quick tip:</strong> The AI works best when it has data to
              learn from. The more transactions it processes, the smarter it
              gets at categorizing and flagging anomalies.
            </Text>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              Questions? Reply to this email or visit our{" "}
              <Link href="https://xenboox.com/docs" className="text-indigo-600">
                documentation
              </Link>
              . We're here to help.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingWelcomeEmail.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
} satisfies WelcomeEmailProps;
