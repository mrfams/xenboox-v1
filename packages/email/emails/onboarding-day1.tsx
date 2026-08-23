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

type Day1EmailProps = {
  userName: string;
  dashboardUrl: string;
  hasConnectedBank: boolean;
};

export function OnboardingDay1Email(props: Day1EmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-2">
              How's your first day going?
            </Heading>
            <Text className="text-gray-600 mb-6">Hi {props.userName},</Text>

            {props.hasConnectedBank ? (
              <>
                <Text className="text-gray-700 leading-relaxed mb-4">
                  Great news — you've already connected your bank account! The
                  AI is now working through your transactions. Here's what's
                  happening behind the scenes:
                </Text>
                <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      ✓ Transactions imported
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Your recent bank transactions are now in Xenboox.
                    </Text>
                  </Section>
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      ✓ AI categorization in progress
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      The AI is sorting transactions into your chart of
                      accounts. Most are categorized automatically.
                    </Text>
                  </Section>
                  <Section>
                    <Text className="font-semibold text-gray-900 m-0">
                      → Review & approve
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Check the Activity Hub for anything the AI isn't sure
                      about. Your approval makes it smarter.
                    </Text>
                  </Section>
                </Section>
              </>
            ) : (
              <>
                <Text className="text-gray-700 leading-relaxed mb-4">
                  You haven't connected your bank account yet. This is the most
                  important step — it's where the magic starts.
                </Text>
                <Text className="text-gray-700 leading-relaxed mb-4">
                  Once connected, the AI will:
                </Text>
                <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m-0">
                      → Auto-categorize transactions
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      No more manual data entry. The AI learns your patterns.
                    </Text>
                  </Section>
                  <Section className="mb-3">
                    <Text className="font-semibold text-gray-900 m:0">
                      → Flag unusual activity
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      Get alerted to anomalies before they become problems.
                    </Text>
                  </Section>
                  <Section>
                    <Text className="font-semibold text-gray-900 m-0">
                      → Generate real-time reports
                    </Text>
                    <Text className="text-gray-600 text-sm m-0">
                      See your cash flow, P&L, and balance sheet updated
                      automatically.
                    </Text>
                  </Section>
                </Section>
                <Section className="text-center mb-6">
                  <Link
                    href={`${props.dashboardUrl}/operations`}
                    className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-sm no-underline"
                  >
                    Connect Your Bank →
                  </Link>
                </Section>
              </>
            )}

            <Text className="text-gray-600 text-sm leading-relaxed">
              <strong>Tip:</strong> The AI categorizes transactions with a
              confidence score. Anything below 70% confidence gets sent to your
              Activity Hub for review. You're always in control.
            </Text>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-xs text-center">
              Questions? Reply to this email — we read every one.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingDay1Email.PreviewProps = {
  userName: "Fatou",
  dashboardUrl: "https://xenboox.com/dashboard",
  hasConnectedBank: false,
} satisfies Day1EmailProps;
