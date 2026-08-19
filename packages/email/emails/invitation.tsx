import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Hr,
} from "@react-email/components";

type InvitationEmailProps = {
  inviterName: string;
  inviterEmail: string;
  entityName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
};

export function InvitationEmail({
  inviterName,
  inviterEmail,
  entityName,
  role,
  inviteUrl,
  expiresAt,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {entityName} on Xenboox
      </Preview>
      <Body
        style={{
          backgroundColor: "#f8f9fa",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "40px 20px",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <Heading
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#14213d",
                margin: 0,
              }}
            >
              Xenboox
            </Heading>
          </div>

          {/* Main Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <Heading
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#14213d",
                margin: "0 0 16px 0",
              }}
            >
              You&apos;re invited to join {entityName}
            </Heading>

            <Text
              style={{
                fontSize: "14px",
                color: "#4a5568",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join <strong>{entityName}</strong> on Xenboox as a{" "}
              <strong>{role}</strong>.
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#4a5568",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              Xenboox is an AI-native accounting platform where your entire
              accounting department runs autonomously — agents do the work, you
              make the decisions that matter.
            </Text>

            {/* CTA Button */}
            <div style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={inviteUrl}
                style={{
                  backgroundColor: "#3b4fe0",
                  color: "#ffffff",
                  padding: "12px 32px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Accept Invitation
              </Button>
            </div>

            {/* Fallback Link */}
            <Text
              style={{
                fontSize: "12px",
                color: "#718096",
                textAlign: "center",
                margin: "0 0 16px 0",
              }}
            >
              Button not working? Copy this link:
            </Text>
            <Text
              style={{
                fontSize: "12px",
                color: "#3b4fe0",
                wordBreak: "break-all",
                textAlign: "center",
                margin: "0 0 24px 0",
              }}
            >
              <Link href={inviteUrl} style={{ color: "#3b4fe0" }}>
                {inviteUrl}
              </Link>
            </Text>

            <Hr
              style={{
                border: "none",
                borderTop: "1px solid #e2e8f0",
                margin: "24px 0",
              }}
            />

            {/* Expiry Notice */}
            <Text
              style={{
                fontSize: "12px",
                color: "#718096",
                textAlign: "center",
                margin: 0,
              }}
            >
              This invitation expires on {expiresAt}. If you didn&apos;t expect
              this email, you can safely ignore it.
            </Text>
          </div>

          {/* Footer */}
          <Text
            style={{
              fontSize: "12px",
              color: "#a0aec0",
              textAlign: "center",
              marginTop: "24px",
            }}
          >
            Xenboox — AI-native accounting for SMEs
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvitationEmail;
