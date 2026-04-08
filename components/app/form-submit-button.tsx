"use client"

import type { ComponentProps, ReactNode } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

export function FormSubmitButton({
  children,
  disabled,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & {
  pendingLabel?: ReactNode
}) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={disabled || pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
