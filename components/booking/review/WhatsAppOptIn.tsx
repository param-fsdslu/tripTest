'use client'

/**
 * WhatsAppOptIn — the guest's consent to booking messages on WhatsApp (required by WhatsApp's
 * business policy before we message them). Sits under the mobile number on the review page; the
 * booking stores it as `whatsapp_opt_in`, and only then does notifyBookingConfirmed send the guest
 * WhatsApp confirmation.
 */
import { MessageCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface WhatsAppOptInProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function WhatsAppOptIn({ checked, onCheckedChange, disabled }: WhatsAppOptInProps) {
  return (
    <label htmlFor="whatsapp-opt-in" className="flex cursor-pointer items-start gap-2.5 text-sm">
      <Checkbox
        id="whatsapp-opt-in"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(!!value)}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="text-foreground/85">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          Send my booking confirmation on WhatsApp
        </span>
        <span className="block text-xs text-muted-foreground">
          Triplovia will message this mobile number about this booking only. You can reply STOP any time.
        </span>
      </span>
    </label>
  )
}
