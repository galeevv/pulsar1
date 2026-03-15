import { redirect } from "next/navigation";

export default function AdminPromoCodesPage() {
  redirect("/admin/codes?tab=promo");
}
