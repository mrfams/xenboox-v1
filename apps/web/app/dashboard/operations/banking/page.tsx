import { permanentRedirect } from "next/navigation";

export default function BankingPage() {
  permanentRedirect("/dashboard/operations?tab=banking");
}
