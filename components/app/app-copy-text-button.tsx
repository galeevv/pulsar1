"use client";

import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AppCopyTextButton({
  className,
  errorMessage = "Не удалось скопировать.",
  label = "Copy",
  successMessage = "Скопировано.",
  value,
}: {
  className?: string;
  errorMessage?: string;
  label?: ReactNode;
  successMessage?: string;
  value: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage, { position: "bottom-right" });
    } catch {
      toast.error(errorMessage, { position: "bottom-right" });
    }
  }

  return (
    <Button className={className} onClick={handleCopy} radius="card" type="button" variant="outline">
      <Copy className="size-4" />
      {label}
    </Button>
  );
}
