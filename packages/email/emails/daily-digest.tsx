import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type DailyDigestProps = {
  userName: string;
  items: Array<{
    type: string;
    count: number;
    items: Array<{ title: string; body: string }>;
  }>;
};

const TYPE_LABELS: Record<string, string> = {
  pending_approvals: "Pending Approvals",
  new_transactions: "New Transactions",
  agent_alerts: "Agent Alerts",
  upcoming_deadlines: "Upcoming Deadlines",
  insights: "AI Insights",
};

export function DailyDigestEmail(props: DailyDigestProps) {
  const totalItems = props.items.reduce((sum, item) => sum + item.count, 0);

  return (
    <EmailLayout
      preview={`Your daily digest: ${totalItems} items need your attention`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Your Daily Digest
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        Hi {props.userName}, here's what happened today.
      </Text>

      {totalItems === 0 ? (
        <InfoBox variant="success">
          <Text className="text-[14px] text-[#16A34A] m-0">
            All caught up! No items need your attention today.
          </Text>
        </InfoBox>
      ) : (
        props.items.map(
          (group) =>
            group.count > 0 && (
              <div key={group.type} className="mb-4">
                <Text className="text-[13px] text-[#64748B] uppercase tracking-wider m-0 mb-2">
                  {TYPE_LABELS[group.type] ?? group.type} ({group.count})
                </Text>
                <div className="bg-[#F8FAFC] rounded-lg p-4">
                  {group.items.slice(0, 5).map((item, i) => (
                    <div key={i}>
                      {i > 0 && <Divider />}
                      <DataRow label={item.title} value={item.body} />
                    </div>
                  ))}
                  {group.count > 5 && (
                    <Text className="text-[12px] text-[#94A3B8] m-0 mt-2 text-center">
                      + {group.count - 5} more
                    </Text>
                  )}
                </div>
              </div>
            ),
        )
      )}
    </EmailLayout>
  );
}

DailyDigestEmail.PreviewProps = {
  userName: "Jane",
  items: [
    {
      type: "pending_approvals",
      count: 3,
      items: [
        { title: "Invoice INV-042", body: "$2,500 — Acme Corp" },
        { title: "Bill BILL-019", body: "$890 — Global Supplies" },
        { title: "Expense EX-108", body: "$125 — Office supplies" },
      ],
    },
    {
      type: "agent_alerts",
      count: 1,
      items: [
        {
          title: "CFO Agent",
          body: "3 transactions need review",
        },
      ],
    },
  ],
} satisfies DailyDigestProps;
