import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type OnboardingWelcomeProps = {
  userName: string;
  dashboardUrl: string;
};

export function OnboardingWelcomeEmail(props: OnboardingWelcomeProps) {
  return (
    <EmailLayout preview="Welcome to Xenboox! Let's set up your books">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Welcome to Xenboox! 🎉
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        You've just joined the future of accounting. Xenboox uses AI to handle
        the books so you can focus on growing your business.
      </Text>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          🚀 Here's what happens next:
        </Text>
        <Text className="text-[13px] text-[#334155] m-0 mt-2">
          1. Connect your bank account (or upload statements)
        </Text>
        <Text className="text-[13px] text-[#334155] m-0">
          2. Our AI categorizes transactions automatically
        </Text>
        <Text className="text-[13px] text-[#334155] m-0">
          3. Get instant financial insights and reports
        </Text>
      </InfoBox>

      <CTAButton href={props.dashboardUrl} label="Go to Dashboard" />
    </EmailLayout>
  );
}

OnboardingWelcomeEmail.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
} satisfies OnboardingWelcomeProps;
