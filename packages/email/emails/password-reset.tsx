import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type PasswordResetProps = {
  userName: string;
  resetUrl: string;
  expiryMinutes: number;
};

export function PasswordResetEmail(props: PasswordResetProps) {
  return (
    <EmailLayout preview="Reset your Xenboox password">
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Reset Your Password
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        We received a request to reset your password. Click the button below to
        choose a new one.
      </Text>

      <CTAButton href={props.resetUrl} label="Reset Password" />

      <InfoBox>
        <Text className="text-[13px] text-[#64748B] m-0">
          ⏱ This link expires in {props.expiryMinutes} minutes. If you didn't
          request a password reset, you can safely ignore this email — your
          password will remain unchanged.
        </Text>
      </InfoBox>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  userName: "Demo User",
  resetUrl: "https://app.xenboox.com/reset-password?token=abc123def456",
  expiryMinutes: 60,
} satisfies PasswordResetProps;
