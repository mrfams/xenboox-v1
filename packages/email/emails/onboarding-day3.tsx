import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type OnboardingDay3Props = {
  userName: string;
  dashboardUrl: string;
  transactionsProcessed: number;
  timeSavedMinutes: number;
};

export function OnboardingDay3Email(props: OnboardingDay3Props) {
  const hasProcessed = props.transactionsProcessed > 0;

  return (
    <EmailLayout
      preview={
        hasProcessed
          ? `Your AI processed ${props.transactionsProcessed} transactions`
          : "Have you seen your first AI insight?"
      }
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        {hasProcessed
          ? `Your AI Processed ${props.transactionsProcessed} Transactions`
          : "Have You Seen Your First AI Insight?"}
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        {hasProcessed
          ? `Our AI has been busy! It categorized ${props.transactionsProcessed} transactions and saved you roughly ${props.timeSavedMinutes} minutes of manual work.`
          : "Xenboox's AI is always working in the background. Here's what it can do for you:"}
      </Text>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          ⏱ Time saved so far: ~{props.timeSavedMinutes} minutes
        </Text>
      </InfoBox>

      <CTAButton href={props.dashboardUrl} label="See What AI Found" />
    </EmailLayout>
  );
}

OnboardingDay3Email.PreviewProps = {
  userName: "Jane",
  dashboardUrl: "https://app.xenboox.com/dashboard",
  transactionsProcessed: 47,
  timeSavedMinutes: 35,
} satisfies OnboardingDay3Props;
