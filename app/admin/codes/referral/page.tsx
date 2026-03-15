import { redirect } from "next/navigation";

export default function AdminReferralCodesPage() {
  redirect("/admin/codes?tab=referral");
}
