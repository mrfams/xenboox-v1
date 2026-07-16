import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Tailwind,
} from "@react-email/components"

type InventoryAlertProps = {
  itemName: string
  sku: string
  currentQuantity: number
  reorderLevel: number
  warehouseName?: string
  entityName: string
}

export function InventoryAlertEmail(props: InventoryAlertProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Low Stock Alert
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName}
            </Text>

            <Section className="bg-white rounded-lg border border-orange-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-orange-800 mb-4">
                Inventory Item Below Reorder Level
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Item</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.itemName}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">SKU</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.sku}</Text>
                </div>
                {props.warehouseName && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600 m-0">Warehouse</Text>
                    <Text className="font-semibold text-gray-900 m-0">{props.warehouseName}</Text>
                  </div>
                )}
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Current Quantity</Text>
                  <Text className="font-bold text-orange-600 m-0">{props.currentQuantity}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Reorder Level</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.reorderLevel}</Text>
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

InventoryAlertEmail.PreviewProps = {
  itemName: "Office Paper A4",
  sku: "INV-001",
  currentQuantity: 5,
  reorderLevel: 20,
  warehouseName: "Main Warehouse",
  entityName: "Xenboox Demo",
} satisfies InventoryAlertProps
