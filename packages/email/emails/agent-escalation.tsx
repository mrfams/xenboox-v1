import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, CTAButton, InfoBox } from "./_layout";

type AgentEscalationProps = {
  agentName: string;
  entityName: string;
  taskDescription: string;
  confidence: number;
  reasoning: string;
  reviewUrl: string;
};

export function AgentEscalationEmail(props: AgentEscalationProps) {
  const confidencePercent = Math.round(props.confidence * 100);

  return (
    <EmailLayout
      preview={`${props.agentName} needs your review — ${confidencePercent}% confidence`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Agent Requires Review 🔍
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.agentName} — {props.entityName}
      </Text>

      <InfoBox variant="warning">
        <Text className="text-[14px] text-[#D97706] m-0">
          Confidence: {confidencePercent}% — This task needs your decision.
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Task" value={props.taskDescription} />
        <Divider />
        <DataRow label="Confidence" value={`${confidencePercent}%`} />
        <Divider />
        <DataRow label="Reasoning" value={props.reasoning} />
      </div>

      <CTAButton href={props.reviewUrl} label="Review & Decide" />

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        The agent flagged this because it's uncertain. Your decision will help
        it learn.
      </Text>
    </EmailLayout>
  );
}

AgentEscalationEmail.PreviewProps = {
  agentName: "CFO Agent",
  entityName: "Acme Corp",
  taskDescription: "Review monthly expense categorization",
  confidence: 0.62,
  reasoning:
    "Several transactions couldn't be confidently categorized. Manual review needed for 12 items.",
  reviewUrl: "https://app.xenboox.com/activity-hub",
} satisfies AgentEscalationProps;
