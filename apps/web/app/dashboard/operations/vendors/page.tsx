import { permanentRedirect } from "next/navigation";

export default function VendorsPage() {
  permanentRedirect("/dashboard/operations?tab=vendors");
}
