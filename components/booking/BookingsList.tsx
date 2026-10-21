'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Eye,
  X,
  Hotel,
  AlertCircle,
  Download,
  Star,
  MessageSquare,
  RefreshCcw,
  XCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format, isPast, isFuture, startOfToday } from 'date-fns'
import { cancelBooking } from '@/lib/actions/bookings'
import { ReviewDialog } from '@/components/reviews/ReviewDialog'
import { getReviewByBookingId } from '@/lib/actions/reviews'
import { invoiceUrl, isInvoiceable } from '@/lib/utils/invoice'

/** 'YYYY-MM-DD' as a local calendar date */
function calendarDate(value: string) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** One status per booking, from booking + payment status, most telling first */
const STATUS_STYLES = {
  refund_requested: { label: 'Refund requested', icon: RefreshCcw, cls: 'bg-primary text-white' },
  refunded: { label: 'Refunded', icon: RefreshCcw, cls: 'bg-secondary text-white' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'bg-destructive text-white' },
  payment_pending: { label: 'Payment pending', icon: Clock, cls: 'bg-amber-500 text-white' },
  checked_in: { label: 'Checked in', icon: KeyRound, cls: 'bg-gold text-secondary' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-secondary text-white' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'bg-primary text-white' },
} as const

function statusOf(b: { booking_status: string; payment_status: string }): keyof typeof STATUS_STYLES {
  if (b.payment_status === 'refund_requested') return 'refund_requested'
  if (b.payment_status === 'refunded' || b.payment_status === 'partially_refunded') return 'refunded'
  if (b.booking_status === 'cancelled') return 'cancelled'
  if (['pending', 'processing', 'failed'].includes(b.payment_status)) return 'payment_pending'
  if (b.booking_status === 'checked_in') return 'checked_in'
  if (b.booking_status === 'checked_out' || b.booking_status === 'completed') return 'completed'
  return 'confirmed'
}

/** Large status pill over the booking photo */
function StatusBadge({ booking }: { booking: { booking_status: string; payment_status: string } }) {
  const { label, icon: Icon, cls } = STATUS_STYLES[statusOf(booking)]
  return (
    <span
      className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

/** Refund progress under a booking card */
const REFUND_NOTES: Record<string, { text: string; tone: 'info' | 'error'; icon: typeof Clock }> = {
  refund_requested: { text: "Refund under review — we'll notify you once approved", tone: 'info', icon: Clock },
  refunded: { text: 'Refund initiated — allow 5–7 business days', tone: 'info', icon: RefreshCcw },
  partially_refunded: { text: 'Refund initiated — allow 5–7 business days', tone: 'info', icon: RefreshCcw },
  refund_rejected: { text: 'Refund not approved — contact support for details', tone: 'error', icon: XCircle },
}

const CANCEL_REASONS = [
  'Change of plans',
  'Found a better option',
  'Medical / health reasons',
  'Travel restrictions',
  'Personal emergency',
  'Other',
]

interface Booking {
  id: string
  booking_reference: string
  check_in_date: string
  check_out_date: string
  num_nights: number
  num_adults: number
  num_children: number
  num_rooms: number
  total_amount: number
  booking_status: string
  payment_status: string
  created_at: string
  hotel: {
    id: string
    name: string
    city: string
    state: string
  }
  room_type: {
    id: string
    name: string
    room_type_images?: Array<{
      image_url: string
      alt_text?: string
    }>
  }
}

interface BookingsListProps {
  bookings: Booking[]
}

export function BookingsList({ bookings }: BookingsListProps) {
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonOther, setCancelReasonOther] = useState('')
  const [cancelReasonError, setCancelReasonError] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null)
  const [bookingReviews, setBookingReviews] = useState<Record<string, any>>({})

  // Every booking in exactly one tab: cancelled; past (stay over); upcoming (the rest, incl.
  // unpaid and stays in progress). Memoised so the reviews effect below runs once per list.
  const { upcomingBookings, pastBookings, cancelledBookings } = useMemo(() => {
    const today = startOfToday()
    const isOver = (b: Booking) =>
      ['completed', 'checked_out'].includes(b.booking_status) || calendarDate(b.check_out_date) < today
    const cancelled = bookings.filter((b) => b.booking_status === 'cancelled')
    const live = bookings.filter((b) => b.booking_status !== 'cancelled')
    return {
      upcomingBookings: live.filter((b) => !isOver(b)),
      pastBookings: live.filter(isOver),
      cancelledBookings: cancelled,
    }
  }, [bookings])

  // Fetch reviews for past bookings
  useEffect(() => {
    const fetchReviews = async () => {
      const reviews: Record<string, any> = {}
      for (const booking of pastBookings) {
        const result = await getReviewByBookingId(booking.id)
        if (result.review) {
          reviews[booking.id] = result.review
        }
      }
      setBookingReviews(reviews)
    }

    if (pastBookings.length > 0) {
      fetchReviews()
    }
  }, [pastBookings])

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setCancelReason('')
    setCancelReasonOther('')
    setCancelReasonError(false)
    setCancelDialogOpen(true)
  }

  const handleReviewClick = (booking: Booking) => {
    setSelectedBookingForReview(booking)
    setReviewDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return

    const resolvedReason = cancelReason === 'Other' ? cancelReasonOther.trim() : cancelReason
    if (!resolvedReason) {
      setCancelReasonError(true)
      return
    }
    setCancelReasonError(false)

    setIsCancelling(true)
    try {
      if (selectedBooking.payment_status === 'paid') {
        const response = await fetch('/api/payment/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: selectedBooking.id,
            reason: resolvedReason,
            isAdminInitiated: false,
            bookingType: 'hotel',
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          alert(data.error || 'Failed to cancel booking')
          return
        }
      } else {
        const result = await cancelBooking(selectedBooking.id, resolvedReason)
        if (!result.success) {
          alert(result.error || 'Failed to cancel booking')
          return
        }
      }

      setCancelDialogOpen(false)
      setSelectedBooking(null)
      router.refresh()
    } catch (error) {
      alert('Failed to cancel booking')
    } finally {
      setIsCancelling(false)
    }
  }

  const renderBookingCard = (booking: Booking) => {
    const image = booking.room_type.room_type_images?.[0]

    return (
      <Card
        key={booking.id}
        className="group @container relative overflow-hidden py-0 transition-shadow hover:border-primary/30 hover:shadow-[0_10px_30px_-14px_rgba(16,127,120,0.35)]"
      >
        {/* The whole card opens the booking; its buttons sit above this link (relative z-10) */}
        <Link
          href={`/bookings/${booking.booking_reference}`}
          className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Open booking ${booking.booking_reference} at ${booking.hotel.name}`}
        />
        <div className="@xl:flex">
          {/* Image */}
          <div className="relative h-44 @xl:h-auto @xl:w-44 flex-shrink-0">
            {image ? (
              <Image
                src={image.image_url}
                alt={image.alt_text || booking.room_type.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Hotel className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <StatusBadge booking={booking} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 p-4 @xl:p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1 transition-colors group-hover:text-primary">
                  {booking.hotel.name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  {booking.hotel.city}, {booking.hotel.state}
                </div>
                <p className="text-sm text-muted-foreground">{booking.room_type.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-xl font-bold text-primary">
                  ₹{Math.round(booking.total_amount).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-x-4 gap-y-3 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">{format(new Date(booking.check_in_date), 'MMM dd')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">{format(new Date(booking.check_out_date), 'MMM dd')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{booking.num_nights} nights</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Guests</p>
                  <p className="font-medium">
                    {booking.num_adults + booking.num_children}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>Ref: {booking.booking_reference}</span>
                <span>•</span>
                <span>Booked on {format(new Date(booking.created_at), 'MMM dd, yyyy')}</span>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/bookings/${booking.booking_reference}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {(booking.booking_status === 'completed' || isPast(new Date(booking.check_out_date))) &&
                  booking.payment_status === 'paid' && (
                    bookingReviews[booking.id] ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewClick(booking)}
                        title="View your review"
                      >
                        <Star className="h-4 w-4 mr-1 fill-gold text-gold" />
                        {bookingReviews[booking.id].status === 'approved' ? 'Reviewed' : 'Pending'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleReviewClick(booking)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Write Review
                      </Button>
                    )
                  )}
                {isInvoiceable(booking) && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={invoiceUrl(booking.booking_reference)} download title="Download the tax invoice (PDF)">
                      <Download className="h-4 w-4 mr-1" />
                      Invoice
                    </a>
                  </Button>
                )}
                {booking.booking_status === 'confirmed' &&
                  isFuture(new Date(booking.check_in_date)) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelClick(booking)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
              </div>
            </div>

            {REFUND_NOTES[booking.payment_status] && (() => {
              const note = REFUND_NOTES[booking.payment_status]
              return (
                <div
                  className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                    note.tone === 'error' ? 'bg-destructive/5 text-destructive' : 'bg-primary/5 text-primary'
                  }`}
                >
                  <note.icon className="h-3 w-3 shrink-0" />
                  {note.text}
                </div>
              )
            })()}
          </div>
        </div>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>Your hotel reservations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Hotel className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start exploring our hotels and make your first reservation
            </p>
            <Button onClick={() => router.push('/hotels')}>
              Browse Hotels
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="upcoming" className="relative">
                Upcoming
                {upcomingBookings.length > 0 && (
                  <Badge className="ml-2 px-1.5 py-0 text-xs" variant="secondary">
                    {upcomingBookings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="past" className="relative">
                Past
                {pastBookings.length > 0 && (
                  <Badge className="ml-2 px-1.5 py-0 text-xs" variant="secondary">
                    {pastBookings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="relative">
                Cancelled
                {cancelledBookings.length > 0 && (
                  <Badge className="ml-2 px-1.5 py-0 text-xs" variant="secondary">
                    {cancelledBookings.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">No upcoming bookings</p>
                </div>
              ) : (
                upcomingBookings.map(renderBookingCard)
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">No past bookings</p>
                </div>
              ) : (
                pastBookings.map(renderBookingCard)
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <X className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">No cancelled bookings</p>
                </div>
              ) : (
                cancelledBookings.map(renderBookingCard)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        if (!isCancelling) setCancelDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please tell us why you&apos;re cancelling so we can improve.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2">
              {/* Booking summary */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-semibold text-foreground mb-1">
                  {selectedBooking.hotel.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedBooking.check_in_date), 'MMM dd')} –{' '}
                  {format(new Date(selectedBooking.check_out_date), 'MMM dd, yyyy')}
                  {' · '}Ref: {selectedBooking.booking_reference}
                </p>
              </div>

              {/* Reason selector */}
              <div className="space-y-2">
                <Label className={cancelReasonError ? 'text-destructive' : ''}>
                  Reason for cancellation <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors has-checked:border-primary has-checked:bg-primary/5"
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={() => { setCancelReason(reason); setCancelReasonError(false) }}
                        className="accent-primary"
                      />
                      <span className="text-sm">{reason}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === 'Other' && (
                  <Textarea
                    placeholder="Please describe your reason..."
                    value={cancelReasonOther}
                    onChange={(e) => { setCancelReasonOther(e.target.value); setCancelReasonError(false) }}
                    rows={3}
                    className={cancelReasonError ? 'border-destructive' : ''}
                  />
                )}

                {cancelReasonError && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Please select a reason before cancelling
                  </p>
                )}
              </div>

              {/* Refund / policy notice */}
              {selectedBooking.payment_status === 'paid' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Refund Policy</p>
                    <p>Your refund request will be submitted for admin review and processed within 5–7 business days.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Cancellation Policy</p>
                    <p>This action cannot be undone.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {selectedBookingForReview && (
        <ReviewDialog
          booking={{
            id: selectedBookingForReview.id,
            booking_reference: selectedBookingForReview.booking_reference,
            hotel: selectedBookingForReview.hotel,
            check_in_date: selectedBookingForReview.check_in_date,
            check_out_date: selectedBookingForReview.check_out_date,
          }}
          existingReview={bookingReviews[selectedBookingForReview.id] || null}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
        />
      )}
    </>
  )
}
