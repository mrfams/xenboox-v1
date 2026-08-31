import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, CTAButton, InfoBox } from "./_layout";

type OnboardingDay14Props = {
  userName: string;
  dashboardUrl: string;
  transactionsCategorized: number;
  reportsGenerated: number;
};

export function OnboardingDay14Email(props: OnboardingDay14Props) {
  return (
    <EmailLayout preview="How's Xenboox working for you?">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Two Weeks In — Here's Your Impact
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        It's been two weeks since you joined Xenboox. Here's what our AI has
        accomplished for you:
      </Text>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow
          label="Transactions Categorized"
          value={`${props.transactionsCategorized}`}
          bold
        />
        <Divider />
        <DataRow
          label="Reports Generated"
          value={`${props.reportsGenerated}`}
          bold
        />
      </div>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          💡 Did you know? You can ask the AI assistant anything about your
          finances — just type in the Command Center.
        </Text>
      </InfoBox>

      <CTAButton href={props.dashboardUrl} label="Continue Working" />
    </EmailLayout>
  );
}

OnboardingDay14Email.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
  transactionsCategorized: 156,
  reportsGenerated: 4,
} satisfies OnboardingDay14Props;
