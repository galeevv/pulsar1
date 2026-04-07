"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  applyPromoCodeInlineAction,
  cancelOwnPayoutRequestInlineAction,
  createPayoutRequestInlineAction,
  generateOwnReferralCodeInlineAction,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InlineDialogActionState = {
  message: string;
  nonce: number;
  status: "error" | "idle" | "success";
};

const INLINE_DIALOG_ACTION_INITIAL_STATE: InlineDialogActionState = {
  message: "",
  nonce: 0,
  status: "idle",
};

function useInlineDialogActionFeedback(
  state: InlineDialogActionState,
  refreshOnSuccess: boolean
) {
  const router = useRouter();
  const handledNonceRef = useRef(0);

  useEffect(() => {
    if (state.nonce === 0 || state.nonce === handledNonceRef.current) {
      return;
    }

    handledNonceRef.current = state.nonce;

    if (state.status === "success") {
      toast.success(state.message, { position: "top-right" });
      if (refreshOnSuccess) {
        router.refresh();
      }
      return;
    }

    if (state.status === "error") {
      toast.error(state.message, { position: "top-right" });
    }
  }, [refreshOnSuccess, router, state]);
}

export function PromoCodeApplyForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    applyPromoCodeInlineAction,
    INLINE_DIALOG_ACTION_INITIAL_STATE
  );

  useInlineDialogActionFeedback(state, true);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4" ref={formRef}>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="dashboard-promo-code-input">
          PromoCode
        </label>
        <Input id="dashboard-promo-code-input" name="code" placeholder="Р’РІРµРґРёС‚Рµ РїСЂРѕРјРѕРєРѕРґ" required />
      </div>

      <Button className="h-button w-full px-button-x" disabled={isPending} radius="card" type="submit">
        {isPending ? "РџСЂРёРјРµРЅСЏРµРј..." : "РџСЂРёРјРµРЅРёС‚СЊ РїСЂРѕРјРѕРєРѕРґ"}
      </Button>
    </form>
  );
}

export function GenerateReferralCodeForm({
  canGenerate,
}: {
  canGenerate: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    generateOwnReferralCodeInlineAction,
    INLINE_DIALOG_ACTION_INITIAL_STATE
  );

  useInlineDialogActionFeedback(state, true);

  return (
    <form action={formAction}>
      <Button
        className="h-button w-full px-button-x"
        disabled={!canGenerate || isPending}
        radius="card"
        type="submit"
      >
        {isPending ? "Р“РµРЅРµСЂР°С†РёСЏ..." : "РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ ReferralCode"}
      </Button>
    </form>
  );
}

export function CreatePayoutRequestForm({
  minimumPayoutCredits,
}: {
  minimumPayoutCredits: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createPayoutRequestInlineAction,
    INLINE_DIALOG_ACTION_INITIAL_STATE
  );

  useInlineDialogActionFeedback(state, true);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3" ref={formRef}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="withdraw-bank">
          Р’С‹Р±РµСЂРёС‚Рµ Р±Р°РЅРє
        </label>
        <Select defaultValue="РЎР±РµСЂР±Р°РЅРє" name="payoutBank" required>
          <SelectTrigger id="withdraw-bank">
            <SelectValue placeholder="Р’С‹Р±РµСЂРёС‚Рµ Р±Р°РЅРє" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="РЎР±РµСЂР±Р°РЅРє">РЎР±РµСЂР±Р°РЅРє</SelectItem>
            <SelectItem value="РђР»СЊС„Р°-Р‘Р°РЅРє">РђР»СЊС„Р°-Р‘Р°РЅРє</SelectItem>
            <SelectItem value="Рў-Р‘Р°РЅРє">Рў-Р‘Р°РЅРє</SelectItem>
            <SelectItem value="Ozon Р‘Р°РЅРє">Ozon Р‘Р°РЅРє</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="withdraw-destination">
          РќРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° РёР»Рё РєР°СЂС‚С‹
        </label>
        <Input
          id="withdraw-destination"
          name="payoutDestination"
          placeholder="+7XXXXXXXXXX РёР»Рё 2200 XXXX XXXX XXXX"
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="withdraw-amount">
          РЎСѓРјРјР° (СЃredits)
        </label>
        <Input
          id="withdraw-amount"
          min={minimumPayoutCredits}
          name="amountCredits"
          placeholder={String(minimumPayoutCredits)}
          required
          type="number"
        />
      </div>

      <Button className="w-full" disabled={isPending} radius="card" type="submit">
        {isPending ? "РЎРѕР·РґР°РµРј Р·Р°СЏРІРєСѓ..." : "РЎРѕР·РґР°С‚СЊ Р·Р°СЏРІРєСѓ"}
      </Button>
    </form>
  );
}

export function CancelPayoutRequestForm({
  payoutRequestId,
}: {
  payoutRequestId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    cancelOwnPayoutRequestInlineAction,
    INLINE_DIALOG_ACTION_INITIAL_STATE
  );

  useInlineDialogActionFeedback(state, true);

  return (
    <form action={formAction} className="mt-2">
      <input name="payoutRequestId" type="hidden" value={payoutRequestId} />
      <Button className="w-full sm:w-auto" disabled={isPending} radius="card" size="sm" type="submit" variant="outline">
        {isPending ? "РћС‚РјРµРЅСЏРµРј..." : "РћС‚РјРµРЅРёС‚СЊ Р·Р°СЏРІРєСѓ"}
      </Button>
    </form>
  );
}

