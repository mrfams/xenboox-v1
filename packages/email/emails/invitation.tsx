import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, DataRow, Divider } from "./_layout";

type InvitationProps = {
  inviterName: string;
  inviterEmail: string;
  entityName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
};

export function InvitationEmail(props: InvitationProps) {
  return (
    <EmailLayout
      preview={`${props.inviterName} invited you to join ${props.entityName} on Xenboox`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        You're Invited to Join {props.entityName}
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi there,
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        <strong>{props.inviterName}</strong> ({props.inviterEmail}) has invited
        you to collaborate on <strong>{props.entityName}</strong> using Xenboox
        AI Accounting.
      </Text>

      {/* Invitation details */}
      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-6">
        <DataRow label="Entity" value={props.entityName} />
        <Divider />
        <DataRow label="Your Role" value={props.role} />
        <Divider />
        <DataRow label="Expires" value={props.expiresAt} />
      </div>

      <CTAButton href={props.inviteUrl} label="Accept Invitation" />

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        If you don't know {props.inviterName}, you can safely ignore this
        invitation.
      </Text>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  inviterName: "Jane Smith",
  inviterEmail: "jane@acmecorp.com",
  entityName: "Acme Corp",
  role: "Accountant",
  inviteUrl: "https://app.xenboox.com/invite/abc123",
  expiresAt: "July 15, 2026",
} satisfies InvitationProps;
