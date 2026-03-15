import { Badge } from "@/components/ui/badge";

export function AdminStatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning";
}) {
  return <Badge variant={tone}>{label}</Badge>;
}
