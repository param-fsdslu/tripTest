'use client'

/** Small building blocks shared by the login panel steps */
import type { ComponentProps, ReactNode } from 'react'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Full-width pill button; greys out while disabled, like the reference design */
export function PillButton({
  busy,
  children,
  className,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button
      className={cn(
        'h-12 w-full rounded-full text-sm font-bold uppercase tracking-wider shadow-none',
        'disabled:bg-border disabled:text-muted-foreground disabled:opacity-100',
        className
      )}
      disabled={disabled || busy}
      {...props}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

export function StepHeader({ title, subtitle, onBack }: { title: string; subtitle?: ReactNode; onBack?: () => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <h2 className="text-xl font-bold leading-tight sm:text-[22px]">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50 py-2.5">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">{message}</AlertDescription>
    </Alert>
  )
}

export function FieldLabelText({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-foreground">
      {children}
    </label>
  )
}

/** Text input matching the 48px phone box */
export const authInputClass =
  'h-12 rounded-lg bg-card px-3.5 text-base hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/15'
