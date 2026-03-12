"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_TICKET_CATEGORIES } from "@/lib/support/constants";
import { getSupportCategoryLabel } from "@/lib/support/helpers";
import { createTicketSchema } from "@/lib/support/validators";

type FieldErrors = {
  category?: string;
  message?: string;
  subject?: string;
};

export function SupportTicketCreateForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (payload: { category: string; message: string; subject: string }) => Promise<void>;
}) {
  const [category, setCategory] = useState<(typeof SUPPORT_TICKET_CATEGORIES)[number]>("payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createTicketSchema.safeParse({
      category,
      message,
      subject,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "category" || field === "subject" || field === "message") {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit(parsed.data);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-sm font-medium">Категория</p>
        <Select
          disabled={isSubmitting}
          onValueChange={(value) => {
            setCategory(value as (typeof SUPPORT_TICKET_CATEGORIES)[number]);
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          value={category}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_TICKET_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {getSupportCategoryLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category ? <p className="text-xs text-destructive">{errors.category}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Тема</p>
        <Input
          disabled={isSubmitting}
          maxLength={120}
          minLength={5}
          onChange={(event) => {
            setSubject(event.target.value);
            setErrors((prev) => ({ ...prev, subject: undefined }));
          }}
          placeholder="Опишите проблему кратко"
          value={subject}
        />
        {errors.subject ? <p className="text-xs text-destructive">{errors.subject}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Сообщение</p>
        <Textarea
          className="min-h-28"
          disabled={isSubmitting}
          maxLength={5000}
          minLength={10}
          onChange={(event) => {
            setMessage(event.target.value);
            setErrors((prev) => ({ ...prev, message: undefined }));
          }}
          placeholder="Опишите детали обращения"
          value={message}
        />
        {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : null}
      </div>

      <div>
        <Button className="h-button w-full px-button-x" disabled={isSubmitting} radius="card" type="submit">
          {isSubmitting ? "Отправка..." : "Отправить"}
        </Button>
      </div>
    </form>
  );
}
