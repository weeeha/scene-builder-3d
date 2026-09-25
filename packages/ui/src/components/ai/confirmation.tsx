"use client"

import { Alert, AlertDescription } from "@weeeha/ui/components/alert"
import { Button } from "@weeeha/ui/components/button"
import { cn } from "@weeeha/ui/lib/utils"
import type { ToolUIPart } from "ai"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react"

// ---------------------------------------------------------------------------
// Internal types (mirrors the AI SDK ToolUIPart approval shape)
// ---------------------------------------------------------------------------

type ToolUIPartApproval =
  | {
      id: string
      approved?: never
      reason?: never
    }
  | {
      id: string
      approved: boolean
      reason?: string
    }
  | {
      id: string
      approved: true
      reason?: string
    }
  | {
      id: string
      approved: false
      reason?: string
    }
  | undefined

type ConfirmationContextValue = {
  approval: ToolUIPartApproval
  state: ToolUIPart["state"]
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null)

const useConfirmation = () => {
  const context = useContext(ConfirmationContext)
  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation")
  }
  return context
}

// ---------------------------------------------------------------------------
// Confirmation — root wrapper; uses amber "required" token to signal action-needed
// ---------------------------------------------------------------------------

export type ConfirmationProps = ComponentProps<typeof Alert> & {
  approval?: ToolUIPartApproval
  state: ToolUIPart["state"]
}

export const Confirmation = ({
  className,
  approval,
  state,
  ...props
}: ConfirmationProps) => {
  if (!approval || state === "input-streaming" || state === "input-available") {
    return null
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <Alert
        data-slot="confirmation"
        className={cn(
          "flex flex-col gap-2",
          // Amber "required/action-needed" frame only when action is pending
          state === "approval-requested"
            ? "border-required bg-required/10 text-required"
            : "border text-foreground",
          className
        )}
        {...props}
      />
    </ConfirmationContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// ConfirmationTitle — prompt text
// ---------------------------------------------------------------------------

export type ConfirmationTitleProps = ComponentProps<typeof AlertDescription>

export const ConfirmationTitle = ({
  className,
  ...props
}: ConfirmationTitleProps) => (
  <AlertDescription
    data-slot="confirmation-title"
    className={cn("inline font-sans", className)}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// ConfirmationRequest — shown only when approval-requested
// ---------------------------------------------------------------------------

export type ConfirmationRequestProps = {
  children?: ReactNode
}

export const ConfirmationRequest = ({ children }: ConfirmationRequestProps) => {
  const { state } = useConfirmation()
  if (state !== "approval-requested") {
    return null
  }
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// ConfirmationAccepted — shown when approved + responded
// ---------------------------------------------------------------------------

export type ConfirmationAcceptedProps = {
  children?: ReactNode
}

export const ConfirmationAccepted = ({
  children,
}: ConfirmationAcceptedProps) => {
  const { approval, state } = useConfirmation()
  if (
    !approval?.approved ||
    (state !== "approval-responded" &&
      state !== "output-denied" &&
      state !== "output-available")
  ) {
    return null
  }
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// ConfirmationRejected — shown when rejected + responded
// ---------------------------------------------------------------------------

export type ConfirmationRejectedProps = {
  children?: ReactNode
}

export const ConfirmationRejected = ({
  children,
}: ConfirmationRejectedProps) => {
  const { approval, state } = useConfirmation()
  if (
    approval?.approved !== false ||
    (state !== "approval-responded" &&
      state !== "output-denied" &&
      state !== "output-available")
  ) {
    return null
  }
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// ConfirmationActions — row of confirm/deny buttons
// ---------------------------------------------------------------------------

export type ConfirmationActionsProps = ComponentProps<"div">

export const ConfirmationActions = ({
  className,
  ...props
}: ConfirmationActionsProps) => {
  const { state } = useConfirmation()
  if (state !== "approval-requested") {
    return null
  }
  return (
    <div
      data-slot="confirmation-actions"
      className={cn("flex items-center justify-end gap-2 self-end", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// ConfirmationAction — individual action button
// Confirm → bg-primary (accent); Deny/cancel → variant="outline"
// ---------------------------------------------------------------------------

export type ConfirmationActionProps = ComponentProps<typeof Button>

export const ConfirmationAction = ({
  className,
  ...props
}: ConfirmationActionProps) => (
  <Button
    data-slot="confirmation-action"
    className={cn("h-8 px-3 text-sm", className)}
    type="button"
    {...props}
  />
)
