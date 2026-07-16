import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Tailwind,
} from "@react-email/components"

type AssetCreatedProps = {
  assetName: string
  assetClass: string
  cost: string
  currency: string
  usefulLifeMonths: number
  depreciationMethod: string
  entityName: string
}

export function AssetCreatedEmail(props: AssetCreatedProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              New Fixed Asset Added
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName}
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Asset Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Name</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.assetName}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Class</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.assetClass}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Cost</Text>
                  <Text className="font-bold text-blue-600 m-0">{props.currency} {props.cost}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Useful Life</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.usefulLifeMonths} months</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Depreciation Method</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.depreciationMethod}</Text>
                </div>
              </div>
            </Section>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

AssetCreatedEmail.PreviewProps = {
  assetName: "Company Vehicle",
  assetClass: "Vehicles",
  cost: "150,000",
  currency: "GMD",
  usefulLifeMonths: 60,
  depreciationMethod: "straight_line",
  entityName: "Xenboox Demo",
} satisfies AssetCreatedProps
