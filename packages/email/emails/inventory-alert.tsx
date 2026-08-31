import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider, InfoBox } from "./_layout";

type InventoryAlertProps = {
  itemName: string;
  sku: string;
  currentQuantity: number;
  reorderLevel: number;
  warehouseName?: string;
  entityName: string;
};

export function InventoryAlertEmail(props: InventoryAlertProps) {
  return (
    <EmailLayout
      preview={`Low stock alert: ${props.itemName} (${props.sku})`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        Low Stock Alert ⚠️
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <InfoBox variant="warning">
        <Text className="text-[14px] text-[#D97706] m-0">
          {props.itemName} has dropped below the reorder level.
        </Text>
      </InfoBox>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Item" value={props.itemName} />
        <Divider />
        <DataRow label="SKU" value={props.sku} />
        <Divider />
        <DataRow
          label="Current Stock"
          value={`${props.currentQuantity}`}
          bold
          color="text-[#DC2626]"
        />
        <Divider />
        <DataRow label="Reorder Level" value={`${props.reorderLevel}`} />
        {props.warehouseName && (
          <>
            <Divider />
            <DataRow label="Warehouse" value={props.warehouseName} />
          </>
        )}
      </div>

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        Consider reordering to avoid stockouts.
      </Text>
    </EmailLayout>
  );
}

InventoryAlertEmail.PreviewProps = {
  itemName: "Widget Pro X1",
  sku: "WPX1-001",
  currentQuantity: 3,
  reorderLevel: 10,
  warehouseName: "Main Warehouse",
  entityName: "Acme Corp",
} satisfies InventoryAlertProps;
