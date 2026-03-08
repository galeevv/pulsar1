"use client";

import { useState } from "react";

import { ClipboardPaste } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterCodeField() {
  const [code, setCode] = useState("");

  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor="register-code">
        Invite Code
      </label>
      <div className="relative">
        <Input
          className="pr-12"
          id="register-code"
          name="code"
          onChange={(event) => setCode(event.target.value)}
          placeholder="Введите invite или referral код"
          required
          value={code}
        />
        <Button
          aria-label="Вставить из буфера обмена"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
          onClick={async () => {
            try {
              const value = await navigator.clipboard.readText();
              if (value) {
                setCode(value.trim());
              }
            } catch {
              // Clipboard API can fail if permissions are not granted.
            }
          }}
          radius="card"
          title="Вставить из буфера обмена"
          type="button"
          variant="ghost"
        >
          <ClipboardPaste className="size-4" />
        </Button>
      </div>
    </div>
  );
}
