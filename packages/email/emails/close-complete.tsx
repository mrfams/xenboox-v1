import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, CTAButton, InfoBox } from "./_layout";

type CloseCompleteProps = {
  entityName: string;
  month: string;
  year: number;
  reportUrl: string;
  summary: {
    revenue: string;
    expenses: string;
    netIncome: string;
    totalAssets: string;
  };
};

export function CloseCompleteEmail(props: CloseCompleteProps) {
  return (
    <EmailLayout
      preview={`Month-end close complete for ${props.entityName} — ${props.month} ${props.year}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Month-End Close Complete ✓
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName} — {props.month} {props.year}
      </Text>

      <InfoBox variant="success">
        <Text className="text-[14px] text-[#16A34A] m-0">
          All accounts have been reconciled and the books are closed for this
          period.
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <Text className="text-[13px] text-[#64748B] uppercase tracking-wider m-0 mb-2">
          Financial Summary
        </Text>
        <DataRow label="Revenue" value={props.summary.revenue} />
        <Divider />
        <DataRow label="Expenses" value={props.summary.expenses} />
        <Divider />
        <DataRow label="Net Income" value={props.summary.netIncome} bold />
        <Divider />
        <DataRow label="Total Assets" value={props.summary.totalAssets} />
      </div>

      <CTAButton href={props.reportUrl} label="View Full Report" />
    </EmailLayout>
  );
}

CloseCompleteEmail.PreviewProps = {
  entityName: "Acme Corp",
  month: "July",
  year: 2026,
  reportUrl: "https://app.xenboox.com/reports/monthly/2026-07",
  summary: {
    revenue: "$125,000.00",
    expenses: "$89,500.00",
    netIncome: "$35,500.00",
    totalAssets: "$450,000.00",
  },
} satisfies CloseCompleteProps;
