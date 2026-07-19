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

type VerificationEmailProps = {
  userName: string
  verifyUrl: string
  expiryMinutes: number
}

export function VerificationEmail(props: VerificationEmailProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Verify Your Email Address
            </Heading>
            <Text className="text-gray-600 mb-4">
              Hi {props.userName},
            </Text>
            <Text className="text-gray-600 mb-6">
              Welcome to Xenboox! Please verify your email address to activate your account.
              This link expires in {props.expiryMinutes} minutes.
            </Text>

            <Button
              href={props.verifyUrl}
              className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
            >
              Verify Email Address
            </Button>

            <Hr className="border-gray-200 my-6" />

            <Text className="text-gray-500 text-sm">
              If you did not create a Xenboox account, you can safely ignore this email.
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

VerificationEmail.PreviewProps = {
  userName: "Demo User",
  verifyUrl: "https://app.xenboox.com/verify-email?token=abc123def456",
  expiryMinutes: 60,
} satisfies VerificationEmailProps
