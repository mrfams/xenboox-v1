import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Tailwind,
} from "@react-email/components"

type PasswordResetProps = {
  userName: string
  resetUrl: string
  expiryMinutes: number
}

export function PasswordResetEmail(props: PasswordResetProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Reset Your Password
            </Heading>
            <Text className="text-gray-600 mb-4">
              Hi {props.userName},
            </Text>
            <Text className="text-gray-600 mb-6">
              We received a request to reset your password for your Xenboox account.
              Click the button below to choose a new password. This link expires in {props.expiryMinutes} minutes.
            </Text>

            <Button
              href={props.resetUrl}
              className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
            >
              Reset Password
            </Button>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-sm">
              If you did not request a password reset, you can safely ignore this email. Your
              password will remain unchanged.
            </Text>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

PasswordResetEmail.PreviewProps = {
  userName: "Demo User",
  resetUrl: "https://app.xenboox.com/reset-password?token=abc123def456",
  expiryMinutes: 60,
} satisfies PasswordResetProps
