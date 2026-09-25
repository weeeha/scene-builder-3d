"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@weeeha/ui/lib/utils"
import { Label } from "@weeeha/ui/components/label"
import { Separator } from "@weeeha/ui/components/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className
      )}
      {...props}
    />
  )
}

/* ── Association wiring ─────────────────────────────────────────────────────
   Field generates ids and each part registers only when it actually renders
   with the generated id, so aria-describedby / htmlFor never reference an
   element that does not exist. FieldControl (a Slot — renders no element)
   stamps id, aria-describedby, and aria-invalid onto the control it wraps. */

type FieldContextValue = {
  controlId: string
  descriptionId: string
  errorId: string
  invalid: boolean
  hasControl: boolean
  hasDescription: boolean
  hasError: boolean
  registerControl: () => () => void
  registerDescription: () => () => void
  registerError: () => () => void
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useRegistration(
  register: (() => () => void) | undefined,
  active = true
) {
  useEffect(() => {
    if (!register || !active) return
    return register()
  }, [register, active])
}

const fieldVariants = cva(
  "group/field flex w-full gap-2 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof fieldVariants> & {
    /** Tints the field and flows aria-invalid to FieldControl. */
    "data-invalid"?: boolean | "true" | "false"
  }) {
  const id = useId()
  const [controls, setControls] = useState(0)
  const [descriptions, setDescriptions] = useState(0)
  const [errors, setErrors] = useState(0)
  const registerControl = useCallback(() => {
    setControls((n) => n + 1)
    return () => setControls((n) => n - 1)
  }, [])
  const registerDescription = useCallback(() => {
    setDescriptions((n) => n + 1)
    return () => setDescriptions((n) => n - 1)
  }, [])
  const registerError = useCallback(() => {
    setErrors((n) => n + 1)
    return () => setErrors((n) => n - 1)
  }, [])
  const invalid =
    props["data-invalid"] === true || props["data-invalid"] === "true"
  const context = useMemo<FieldContextValue>(
    () => ({
      controlId: `${id}control`,
      descriptionId: `${id}description`,
      errorId: `${id}error`,
      invalid,
      hasControl: controls > 0,
      hasDescription: descriptions > 0,
      hasError: errors > 0,
      registerControl,
      registerDescription,
      registerError,
    }),
    [
      id,
      invalid,
      controls,
      descriptions,
      errors,
      registerControl,
      registerDescription,
      registerError,
    ]
  )
  return (
    <FieldContext.Provider value={context}>
      <div
        role="group"
        data-slot="field"
        data-orientation={orientation}
        className={cn(fieldVariants({ orientation }), className)}
        {...props}
      />
    </FieldContext.Provider>
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<typeof Label>) {
  const context = useContext(FieldContext)
  return (
    <Label
      data-slot="field-label"
      htmlFor={htmlFor ?? (context?.hasControl ? context.controlId : undefined)}
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/** Wires the wrapped control to the field's label, description, and error.
 *  Renders no element — id, aria-describedby, and aria-invalid land on the
 *  child, whose own explicit props win. One control per Field. */
function FieldControl({
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<typeof Slot.Root>) {
  const context = useContext(FieldContext)
  useRegistration(context?.registerControl, id == null)
  const describedBy =
    [
      ariaDescribedBy,
      context?.hasDescription ? context.descriptionId : undefined,
      context?.hasError ? context.errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  return (
    <Slot.Root
      data-slot="field-control"
      id={id ?? context?.controlId}
      aria-describedby={describedBy}
      aria-invalid={ariaInvalid ?? (context?.invalid || undefined)}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  id,
  ...props
}: React.ComponentProps<"p">) {
  const context = useContext(FieldContext)
  useRegistration(context?.registerDescription, id == null)
  return (
    <p
      data-slot="field-description"
      id={id ?? context?.descriptionId}
      className={cn(
        "text-start text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  id,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const context = useContext(FieldContext)
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ms-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  useRegistration(context?.registerError, content != null && id == null)

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      id={id ?? context?.errorId}
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldControl,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
