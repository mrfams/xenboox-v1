import { permanentRedirect } from "next/navigation";

export default function CustomersPage() {
  permanentRedirect("/dashboard/operations?tab=customers");
}
