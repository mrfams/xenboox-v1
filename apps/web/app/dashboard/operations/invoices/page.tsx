import { permanentRedirect } from "next/navigation";

export default function InvoicesPage() {
  permanentRedirect("/dashboard/operations?tab=invoices");
}
