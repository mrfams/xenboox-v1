import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type OnboardingDay7Props = {
  userName: string;
  dashboardUrl: string;
};

export function OnboardingDay7Email(props: OnboardingDay7Props) {
  return (
    <EmailLayout preview="Ready for the next level?">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Ready for the Next Level? 🚀
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        You've been using Xenboox for a week now. Here are some features you
        might not have tried yet:
      </Text>

      <InfoBox variant="default">
        <Text className="text-[14px] text-[#0F172A] m-0 mb-2">
          📊 <strong>Financial Pulse</strong> — AI-narrated health of your business
        </Text>
        <Text className="text-[14px] text-[#0F172A] m-0 mb-2">
          🤖 <strong>Agent Assist</strong> — Let AI handle reconciliations
        </Text>
        <Text className="text-[14px] text-[#0F172A] m-0">
          📄 <strong>Smart Invoicing</strong> — Create and send invoices in seconds
        </Text>
      </InfoBox>

      <CTAButton href={props.dashboardUrl} label="Explore Features" />
    </EmailLayout>
  );
}

OnboardingDay7Email.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
} satisfies OnboardingDay7Props;
