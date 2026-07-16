import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Tailwind,
} from "@react-email/components"

type AgentEscalationProps = {
  agentName: string
  entityName: string
  taskDescription: string
  confidence: number
  reasoning: string
  reviewUrl: string
}

export function AgentEscalationEmail(props: AgentEscalationProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-amber-600 mb-4">
              Agent Requires Your Review
            </Heading>
            <Text className="text-gray-600 mb-6">
              <strong>{props.agentName}</strong> has flagged a task requiring human review.
            </Text>

            <Section className="bg-white rounded-lg border border-amber-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Task Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Agent</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.agentName}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Entity</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.entityName}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Confidence</Text>
                  <Text className="font-bold text-amber-600 m-0">
                    {(props.confidence * 100).toFixed(0)}%
                  </Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div>
                  <Text className="text-gray-600 m-0 mb-2">Task</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.taskDescription}</Text>
                </div>
                <Hr className="border-gray-200 my-2" />
                <div>
                  <Text className="text-gray-600 m-0 mb-2">Reasoning</Text>
                  <Text className="text-gray-700 m-0">{props.reasoning}</Text>
                </div>
              </div>
            </Section>

            <Button
              href={props.reviewUrl}
              className="bg-amber-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
            >
              Review Task
            </Button>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

AgentEscalationEmail.PreviewProps = {
  agentName: "AP Agent",
  entityName: "Acme Corp",
  taskDescription: "Process invoice from Supplier XYZ for $15,000",
  confidence: 0.65,
  reasoning: "Invoice amount exceeds usual threshold. Vendor not in approved list.",
  reviewUrl: "https://app.xenboox.com/agent/review/task-123",
} satisfies AgentEscalationProps
