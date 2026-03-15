import { redirect } from "next/navigation";

export default function AdminInviteCodesPage() {
  redirect("/admin/codes?tab=invite");
}
