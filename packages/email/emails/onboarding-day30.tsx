import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, CTAButton, InfoBox } from "./_layout";

type OnboardingDay30Props = {
  userName: string;
  dashboardUrl: string;
  transactionsCategorized: number;
  timeSavedHours: number;
};

export function OnboardingDay30Email(props: OnboardingDay30Props) {
  return (
    <EmailLayout preview="You're becoming a power user! 🎉">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        One Month — You're a Power User! 🎉
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        You've been using Xenboox for a full month. Here's the impact our AI
        has had on your accounting:
      </Text>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow
          label="Transactions Categorized"
          value={`${props.transactionsCategorized}`}
          bold
        />
        <Divider />
        <DataRow
          label="Time Saved"
          value={`~${props.timeSavedHours} hours`}
          bold
          color="text-[#16A34A]"
        />
      </div>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          🏆 You're in the top 20% of Xenboox users by engagement. Keep it up!
        </Text>
      </InfoBox>

      <CTAButton href={props.dashboardUrl} label="Keep Going" />
    </EmailLayout>
  );
}

OnboardingDay30Email.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
  transactionsCategorized: 412,
  timeSavedHours: 8,
} satisfies OnboardingDay30Props;
