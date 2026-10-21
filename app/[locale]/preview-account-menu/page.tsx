// TEMPORARY design preview (booking hero pattern, date band, My Bookings cards) with sample data. Delete after checking.
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { BookingsList } from '@/components/booking/BookingsList'
import { DateHighlight } from '@/components/booking/BookingConfirmation'
import { MapPattern } from '@/components/booking/MapPattern'

const sample = (id: string, ref: string, checkIn: string, checkOut: string, status: string, payment: string) => ({
  id, booking_reference: ref, check_in_date: checkIn, check_out_date: checkOut, num_nights: 2, num_adults: 2, num_children: 0,
  num_rooms: 1, total_amount: 1.07, booking_status: status, payment_status: payment, created_at: '2026-10-21T10:00:00Z',
  hotel: { id: 'h', name: '₹1 Payment Test Stay (Not a Real Hotel)', city: 'Honnavar', state: 'Karnataka' },
  room_type: { id: 'r', name: '₹1 Test Room', room_type_images: [{ image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=80' }] },
})

const heroes = [
  { title: 'Booking Confirmed', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #107F78 0%, #073F3D 100%)' },
  { title: 'Payment Pending', icon: Clock, gradient: 'linear-gradient(135deg, #78350f 0%, #3c1a05 100%)' },
  { title: 'Booking Cancelled', icon: XCircle, gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' },
]

export default function Preview() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent={false} />
      <main className="page-container space-y-6 pt-24 pb-16">
        {heroes.map(({ title, icon: Icon, gradient }) => (
          <div key={title} className="relative overflow-hidden rounded-2xl" style={{ background: gradient }}>
            <MapPattern />
            <div className="relative px-6 py-8 text-center sm:px-10 sm:py-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-9 w-9 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              <p className="mt-1 text-sm text-white/65">Your reservation is confirmed — we look forward to hosting you.</p>
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-white p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-primary/15 bg-mint/50 p-3 sm:gap-4 sm:p-4">
            <DateHighlight label="Check-in" date="2026-11-14" time="From 12:00" tone="primary" />
            <div className="flex flex-col items-center gap-1.5 text-primary">
              <span className="whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">2 nights</span>
              <span className="hidden h-px w-14 border-t-2 border-dashed border-primary/30 sm:block" />
            </div>
            <DateHighlight label="Check-out" date="2026-11-16" time="Until 11:00" tone="gold" align="right" />
          </div>
        </div>

        <BookingsList
          bookings={[
            sample('p1', 'BK-20261021-92Y9', '2026-11-14', '2026-11-16', 'confirmed', 'paid'),
            sample('p2', 'BK-20261021-Q9KD', '2026-12-01', '2026-12-03', 'pending', 'pending'),
          ] as any}
        />
      </main>
    </div>
  )
}
