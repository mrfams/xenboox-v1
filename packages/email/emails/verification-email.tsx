import { Text, Heading } from "@react-email/components";
import { EmailLayout, CTAButton, InfoBox } from "./_layout";

type VerificationEmailProps = {
  userName: string;
  verifyUrl: string;
  expiryMinutes: number;
};

export function VerificationEmail(props: VerificationEmailProps) {
  return (
    <EmailLayout
      preview={`Verify your email to activate your ${BRAND_NAME} account`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-4">
        Verify Your Email Address
      </Heading>

      <Text className="text-[15px] text-[#334155] m-0 mb-2">
        Hi {props.userName},
      </Text>

      <Text className="text-[15px] text-[#334155] m-0 mb-6">
        Welcome to Xenboox! Please verify your email address to activate your
        account and start using AI-native accounting.
      </Text>

      <CTAButton href={props.verifyUrl} label="Verify Email Address" />

      <InfoBox>
        <Text className="text-[13px] text-[#64748B] m-0">
          ⏱ This link expires in {props.expiryMinutes} minutes. If you didn't
          create a Xenboox account, you can safely ignore this email.
        </Text>
      </InfoBox>
    </EmailLayout>
  );
}

const BRAND_NAME = "Xenboox";

VerificationEmail.PreviewProps = {
  userName: "Demo User",
  verifyUrl: "https://app.xenboox.com/verify-email?token=abc123def456",
  expiryMinutes: 60,
} satisfies VerificationEmailProps;
