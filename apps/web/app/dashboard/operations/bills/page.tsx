import { permanentRedirect } from "next/navigation";

export default function BillsPage() {
  permanentRedirect("/dashboard/operations?tab=bills");
}
