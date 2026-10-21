import { BadgeCheck, CalendarX2, Headset, ShieldCheck } from 'lucide-react'
import { FREE_CANCELLATION_HOURS } from '@/lib/config/cancellation-policy'

const POINTS = [
  {
    icon: BadgeCheck,
    title: 'Curated stays',
    text: 'Hotels and homestays selected along the Honnavar coast.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'Pay safely with UPI, cards and net banking via Razorpay.',
  },
  {
    icon: CalendarX2,
    title: 'Flexible cancellation',
    text: `Cancel up to ${FREE_CANCELLATION_HOURS} hours before check-in for a refund, minus the gateway fee.`,
  },
  {
    icon: Headset,
    title: 'Local support',
    text: 'Real people in Honnavar, a call or WhatsApp away.',
  },
]

/** Four reasons to book with Triplovia, shown under the hero search */
export function TrustBar() {
  return (
    <section className="py-12 sm:py-16">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
