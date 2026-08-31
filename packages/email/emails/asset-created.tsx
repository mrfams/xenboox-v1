import { Text, Heading } from "@react-email/components";
import { EmailLayout, DataRow, Divider } from "./_layout";

type AssetCreatedProps = {
  assetName: string;
  assetClass: string;
  cost: string;
  currency: string;
  usefulLifeMonths: number;
  depreciationMethod: string;
  entityName: string;
};

export function AssetCreatedEmail(props: AssetCreatedProps) {
  return (
    <EmailLayout
      preview={`New fixed asset added: ${props.assetName}`}
    >
      <Heading className="text-[22px] font-bold text-[#0F172A] m-0 mb-2">
        New Fixed Asset Added 🏢
      </Heading>

      <Text className="text-[15px] text-[#64748B] m-0 mb-6">
        {props.entityName}
      </Text>

      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
        <DataRow label="Asset" value={props.assetName} bold />
        <Divider />
        <DataRow label="Class" value={props.assetClass} />
        <Divider />
        <DataRow
          label="Cost"
          value={`${props.currency} ${props.cost}`}
          bold
        />
        <Divider />
        <DataRow
          label="Useful Life"
          value={`${props.usefulLifeMonths} months`}
        />
        <Divider />
        <DataRow label="Depreciation" value={props.depreciationMethod} />
      </div>

      <Text className="text-[13px] text-[#94A3B8] m-0 mt-4 text-center">
        Depreciation will be calculated automatically each month.
      </Text>
    </EmailLayout>
  );
}

AssetCreatedEmail.PreviewProps = {
  assetName: "Office Laptop — MacBook Pro",
  assetClass: "Computer Equipment",
  cost: "2,499.00",
  currency: "USD",
  usefulLifeMonths: 36,
  depreciationMethod: "Straight-Line",
  entityName: "Acme Corp",
} satisfies AssetCreatedProps;
