import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type OnboardingDay1Props = {
  userName: string;
  dashboardUrl: string;
  hasConnectedBank: boolean;
};

export function OnboardingDay1Email(props: OnboardingDay1Props) {
  return (
    <EmailLayout preview="How's your first day going?">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        How's Your First Day Going?
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        {props.hasConnectedBank
          ? "Great job connecting your bank! Your transactions are being processed by our AI right now."
          : "Have you had a chance to connect your bank account? It's the fastest way to get your books started."}
      </Text>

      <InfoBox variant={props.hasConnectedBank ? "success" : "default"}>
        <Text className="text-[14px] text-[#0F172A] m-0">
          {props.hasConnectedBank
            ? "✅ Bank connected — AI is categorizing your transactions"
            : "💡 Tip: Connecting your bank takes 2 minutes and gives you instant insights"}
        </Text>
      </InfoBox>

      <CTAButton
        href={props.dashboardUrl}
        label={props.hasConnectedBank ? "View Your Dashboard" : "Connect Bank Account"}
      />
    </EmailLayout>
  );
}

OnboardingDay1Email.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
  hasConnectedBank: false,
} satisfies OnboardingDay1Props;
