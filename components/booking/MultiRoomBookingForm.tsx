'use client'

/**
 * MultiRoomBookingForm — unified checkout for one or more room types.
 *
 * Accepts an array of { room, qty } selections for a single hotel.
 * Guest details and dates are shared across all room types.
 * Meal plans are per-guest and apply to all guests across the stay.
 * On submit, calls POST /api/bookings/multi which creates one booking
 * record per room type and returns all IDs for a single Razorpay payment.
 */
import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { useBookingStore, useBookingHydration } from '@/lib/stores/use-booking-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout'
import { PayButton } from '@/components/payment/PayButton'
import { CancellationPolicyNotice } from '@/components/booking/CancellationPolicyNotice'
import { StaySummaryCard } from '@/components/booking/review/StaySummaryCard'
import { PriceBreakupCard } from '@/components/booking/review/PriceBreakupCard'
import {
  EMPTY_GST_DETAILS,
  GstDetailsFields,
  gstDetailsError,
  gstDetailsForRequest,
} from '@/components/booking/review/GstDetailsFields'
import { WhatsAppOptIn } from '@/components/booking/review/WhatsAppOptIn'
import { PetsOptIn } from '@/components/booking/review/PetsOptIn'
import {
  User, Mail, Phone, Users, Baby,
  BedDouble, AlertCircle, CheckCircle2, Loader2,
  UtensilsCrossed, Info, Minus, Plus,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { cn, getRoomGstRate, isValidPhone, SERVICE_CHARGE_RATE, GST_ON_SERVICE_CHARGE_RATE, MEAL_GST_RATE, calculateExtraBedCharge, calculateRoomStayPricing, type PriceRuleInput } from '@/lib/utils'
import type { MealPlan, MealType } from '@/lib/types'
import { formatPhone } from '@/lib/utils/phone'
import { saveStay } from '@/lib/actions/saved-stays'
import { GUEST_EMAIL_HINT, GuestCheckoutNote } from '@/components/booking/BookingForm'

// ── Types ────────────────────────────────────────────────────────────────────

interface RoomType {
  id: string
  name: string
  description?: string
  base_price: number
  max_adults: number
  max_children: number
  max_occupancy: number
  standard_occupancy: number
  extra_bed_price: number
  num_available_rooms?: number
  bed_configuration?: string
}

interface RoomSelection {
  room: RoomType
  qty: number
}

interface Hotel {
  id: string
  name: string
  address_line_1: string
  city: string
  state: string
  check_in_from_time?: string
  check_out_time?: string
  star_rating?: number | null
  image_url?: string | null
  pet_policy_text?: string | null
}

interface MultiRoomBookingFormProps {
  hotel: Hotel
  selections: RoomSelection[]
  priceRules?: PriceRuleInput[]
  mealPlans?: MealPlan[]
  userId?: string
  userEmail?: string
  userName?: string
  /** The account's mobile number (E.164), e.g. from a mobile-number sign-in */
  userPhone?: string
  initialCheckIn?: Date
  initialCheckOut?: Date
  initialAdults?: number
  initialChildren?: number
  /** Travelling with pets, from the search box */
  initialPets?: boolean
}

// ── Meal plan helpers (same as BookingForm) ───────────────────────────────────

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}
const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

function childMealCategory(age: number): 'infant' | 'child' | 'adult' {
  if (age <= 5) return 'infant'
  if (age <= 11) return 'child'
  return 'adult'
}

function mealPlanCost(
  mp: MealPlan,
  numAdults: number,
  childrenAges: number[],
  numNights: number
) {
  const childrenFromAges = childrenAges.filter((a) => childMealCategory(a) === 'child').length
  const adultsFromChildren = childrenAges.filter((a) => childMealCategory(a) === 'adult').length
  const totalAdultGuests = numAdults + adultsFromChildren
  const childUnitPrice = mp.child_price_per_person ?? mp.price_per_person
  const adultCost = mp.price_per_person * totalAdultGuests * numNights
  const childCost = childUnitPrice * childrenFromAges * numNights
  return { adultCost, childCost, total: adultCost + childCost }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MultiRoomBookingForm({
  hotel,
  selections: initialSelections,
  priceRules = [],
  mealPlans = [],
  userId,
  userEmail,
  userName,
  userPhone,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialPets,
}: MultiRoomBookingFormProps) {
  const router = useRouter()
  const savedGuest = useBookingStore((s) => s.guestDetails)
  const setGuestDetails = useBookingStore((s) => s.setGuestDetails)
  const hydrated = useBookingHydration()

  // Guest details
  const [firstName, setFirstName] = useState(userName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(userName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(userEmail || '')
  const [phone, setPhone] = useState(userPhone ? formatPhone(userPhone) : '')

  // Signed in: keep this selection on the account until it's paid (lib/actions/saved-stays.ts).
  // Guests get theirs kept under their mobile number when the booking is created.
  useEffect(() => {
    if (!userId) return
    saveStay({
      hotelId: hotel.id,
      rooms: initialSelections.map(({ room, qty }) => ({ roomId: room.id, qty })),
      checkIn: initialCheckIn ? format(initialCheckIn, 'yyyy-MM-dd') : undefined,
      checkOut: initialCheckOut ? format(initialCheckOut, 'yyyy-MM-dd') : undefined,
      adults: initialAdults,
      children: initialChildren,
      pets: initialPets,
    }).catch(() => {})
    // Once per visit to the review page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id])

  useEffect(() => {
    if (!hydrated) return
    if (!firstName && savedGuest.firstName) setFirstName(savedGuest.firstName)
    if (!lastName && savedGuest.lastName) setLastName(savedGuest.lastName)
    if (!email && savedGuest.email) setEmail(savedGuest.email)
    if (!phone && savedGuest.phone) setPhone(savedGuest.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Stay details (shared across all room types) — pre-filled from search via URL params
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(initialCheckIn)
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(initialCheckOut)
  const [numAdults, setNumAdults] = useState(initialAdults ?? 1)
  const [numChildren, setNumChildren] = useState(initialChildren ?? 0)
  const [withPets, setWithPets] = useState(initialPets ?? false)
  const [childrenAges, setChildrenAges] = useState<number[]>([])
  const [specialRequests, setSpecialRequests] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(true)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstDetails, setGstDetails] = useState(EMPTY_GST_DETAILS)
  const [selectedMealPlanIds, setSelectedMealPlanIds] = useState<string[]>([])

  // Per-room-type quantities (adjustable in form)
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(initialSelections.map((s) => [s.room.id, s.qty]))
  )

  // Booking state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [bookingCreated, setBookingCreated] = useState<{
    bookingIds: string[]
    primaryBookingReference: string
    totalAmount: number
  } | null>(null)

  // "Proceed to payment" creates the bookings and opens Razorpay in one go; the Pay button below is for retries
  const checkout = useRazorpayCheckout()
  const [paymentClosed, setPaymentClosed] = useState(false)

  const openPayment = (booking: { bookingIds: string[]; primaryBookingReference: string }) => {
    setError(null)
    setPaymentClosed(false)
    return checkout.startPayment(
      {
        bookingIds: booking.bookingIds,
        bookingReference: booking.primaryBookingReference,
        guestName: `${firstName} ${lastName}`,
        guestEmail: email,
        guestPhone: phone,
      },
      { onDismiss: () => setPaymentClosed(true), onError: setError }
    )
  }

  // Sync children ages array length with numChildren
  useEffect(() => {
    setChildrenAges((prev) => {
      if (numChildren > prev.length)
        return [...prev, ...Array(numChildren - prev.length).fill(0)]
      return prev.slice(0, numChildren)
    })
  }, [numChildren])

  // Active selections with their quantities
  const activeSelections = initialSelections
    .map((s) => ({ room: s.room, qty: quantities[s.room.id] ?? s.qty }))
    .filter((s) => s.qty > 0)

  // ── Pricing calculations ──────────────────────────────────────────────────
  const numNights =
    checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0
  const checkInStr = checkInDate ? format(checkInDate, 'yyyy-MM-dd') : ''
  const checkOutStr = checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : ''

  // Resolved nightly pricing (weekend/festival/custom overrides applied) per room-type selection.
  const selectionPricing = activeSelections.map(({ room, qty }) => {
    const { subtotal, nights } =
      checkInStr && checkOutStr
        ? calculateRoomStayPricing(room, checkInStr, checkOutStr, qty, priceRules)
        : { subtotal: 0, nights: [] as ReturnType<typeof calculateRoomStayPricing>['nights'] }
    return { room, qty, subtotal, nights }
  })

  const roomSubtotal = selectionPricing.reduce((sum, s) => sum + s.subtotal, 0)

  const selectedMealPlans = mealPlans.filter((mp) => selectedMealPlanIds.includes(mp.id))
  const mealPlanTotal = selectedMealPlans.reduce(
    (sum, mp) => sum + mealPlanCost(mp, numAdults, childrenAges, numNights).total,
    0
  )

  // Per-room-type GST (slab determined by each room's base_price, not the total)
  const roomGstTotal = selectionPricing.reduce(
    (sum, s) => sum + s.subtotal * getRoomGstRate(s.room.base_price),
    0
  )
  const mealGstAmount = mealPlanTotal * MEAL_GST_RATE
  const serviceCharge = roomSubtotal * SERVICE_CHARGE_RATE
  const gstOnServiceCharge = serviceCharge * GST_ON_SERVICE_CHARGE_RATE
  const totalTax = roomGstTotal + mealGstAmount + serviceCharge + gstOnServiceCharge

  const extraBedCharge = calculateExtraBedCharge(
    activeSelections.map(({ room, qty }) => ({
      qty,
      standardOccupancy: room.standard_occupancy,
      maxOccupancy: room.max_occupancy,
      extraBedPrice: room.extra_bed_price,
    })),
    numAdults + numChildren,
    numNights
  )

  const grandTotal = roomSubtotal + mealPlanTotal + totalTax + extraBedCharge

  const totalRooms = activeSelections.reduce((sum, sel) => sum + sel.qty, 0)
  const guestsLabel = [
    `${numAdults} ${numAdults === 1 ? 'Adult' : 'Adults'}`,
    numChildren > 0 ? `${numChildren} ${numChildren === 1 ? 'Child' : 'Children'}` : null,
    `${totalRooms} ${totalRooms === 1 ? 'Room' : 'Rooms'}`,
    withPets ? 'With pets' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // ── Handlers ─────────────────────────────────────────────────────────────

  const adjustQty = (roomId: string, delta: number) => {
    setQuantities((prev) => {
      const room = initialSelections.find((s) => s.room.id === roomId)?.room
      const maxAvail = room?.num_available_rooms ?? 10
      const next = Math.min(Math.max((prev[roomId] ?? 1) + delta, 1), maxAvail)
      return { ...prev, [roomId]: next }
    })
  }

  const handleChildAgeChange = (index: number, age: number) => {
    setChildrenAges((prev) => {
      const next = [...prev]
      next[index] = age
      return next
    })
  }

  // Max occupancy across ALL selected rooms combined
  const maxTotalOccupancy = activeSelections.reduce(
    (sum, { room, qty }) => sum + room.max_occupancy * qty,
    0
  )
  const maxAdultsAllowed = activeSelections.reduce(
    (sum, { room, qty }) => sum + room.max_adults * qty,
    0
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!termsAccepted) throw new Error('Please accept the Terms & Conditions, Privacy Policy, and Refund Policy to continue')
      if (!isValidPhone(phone)) throw new Error('Please enter a valid 10-digit Indian mobile number')
      const gstError = gstDetailsError(gstEnabled, gstDetails)
      if (gstError) throw new Error(gstError)
      if (!checkInDate || !checkOutDate) throw new Error('Please select check-in and check-out dates')
      if (numNights < 1) throw new Error('Check-out date must be after check-in date')
      if (numAdults < 1) throw new Error('At least one adult is required')
      if (numAdults + numChildren > maxTotalOccupancy) {
        throw new Error(`Maximum ${maxTotalOccupancy} total guests across all selected rooms`)
      }
      if (activeSelections.length === 0) throw new Error('Please select at least one room')

      const body = {
        userId,
        hotelId: hotel.id,
        rooms: activeSelections.map(({ room, qty }) => ({
          roomTypeId: room.id,
          numRooms: qty,
        })),
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        gstDetails: gstDetailsForRequest(gstEnabled, gstDetails),
        whatsappOptIn,
        withPets,
        checkInDate: format(checkInDate, 'yyyy-MM-dd'),
        checkOutDate: format(checkOutDate, 'yyyy-MM-dd'),
        numAdults,
        numChildren,
        childrenAges,
        specialRequests,
        mealPlanTotal,
        mealPlans: selectedMealPlans.map((mp) => {
          const { adultCost, childCost, total } = mealPlanCost(mp, numAdults, childrenAges, numNights)
          return {
            mealPlanId: mp.id,
            mealType: mp.meal_type,
            name: mp.name,
            pricePerPerson: mp.price_per_person,
            childPricePerPerson: mp.child_price_per_person,
            numGuests: numAdults + numChildren,
            numNights,
            totalAmount: total,
          }
        }),
      }

      const response = await fetch('/api/bookings/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create booking')

      setGuestDetails({ firstName, lastName, email, phone })
      const created = {
        bookingIds: result.bookingIds,
        primaryBookingReference: result.primaryBookingReference,
        totalAmount: result.totalAmount,
      }
      setBookingCreated(created)
      setIsSubmitting(false)
      await openPayment(created)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* ── Left: form ────────────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <form id="multi-booking-form" onSubmit={handleSubmit}>
          <div className="space-y-6">

            {/* Hotel + stay (dates, guests, rooms) — MakeMyTrip-style review header */}
            <StaySummaryCard
              hotel={hotel}
              checkIn={checkInDate}
              checkOut={checkOutDate}
              onCheckInChange={setCheckInDate}
              onCheckOutChange={setCheckOutDate}
              guestsLabel={guestsLabel}
              locked={!!bookingCreated}
            >
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
                  <BedDouble className="h-4 w-4 text-primary" />
                  Your rooms
                </h3>
              {initialSelections.map(({ room }) => {
                const qty = quantities[room.id] ?? 1
                const maxAvail = room.num_available_rooms ?? 10
                return (
                  <div key={room.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/60 bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{room.base_price.toLocaleString('en-IN')}/night · max {room.max_occupancy} guests/room
                      </p>
                      {room.bed_configuration && (
                        <p className="text-xs text-muted-foreground">{room.bed_configuration}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => adjustQty(room.id, -1)}
                        disabled={qty <= 1 || !!bookingCreated}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold text-sm">{qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => adjustQty(room.id, 1)}
                        disabled={qty >= maxAvail || !!bookingCreated}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="text-xs">
                        {maxAvail} avail.
                      </Badge>
                    </div>
                  </div>
                )
              })}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numAdults">Adults *</Label>
                  <Select value={numAdults.toString()} onValueChange={(v) => setNumAdults(parseInt(v))} disabled={!!bookingCreated}>
                    <SelectTrigger id="numAdults" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.max(maxAdultsAllowed, 10) }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          <div className="flex items-center gap-2"><Users className="h-4 w-4" />{n} {n === 1 ? 'Adult' : 'Adults'}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numChildren">Children</Label>
                  <Select value={numChildren.toString()} onValueChange={(v) => setNumChildren(parseInt(v))} disabled={!!bookingCreated}>
                    <SelectTrigger id="numChildren" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          <div className="flex items-center gap-2"><Baby className="h-4 w-4" />{n} {n === 1 ? 'Child' : 'Children'}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <PetsOptIn checked={withPets} onCheckedChange={setWithPets} policy={hotel.pet_policy_text} disabled={!!bookingCreated} />

              {numChildren > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Children's Ages</Label>
                    <span className="text-xs text-muted-foreground">(required for meal pricing)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: numChildren }, (_, i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Child {i + 1}</Label>
                        <Select value={childrenAges[i]?.toString() ?? '0'} onValueChange={(v) => handleChildAgeChange(i, parseInt(v))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Age" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 18 }, (_, age) => (
                              <SelectItem key={age} value={age.toString()}>
                                {age === 0 ? 'Under 1' : `${age} yr${age !== 1 ? 's' : ''}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <Alert className="py-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Age 0–5: Infant (no meal charge) · Age 6–11: Child rate · Age 12+: Adult rate
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Selected rooms fit up to {maxTotalOccupancy} guests in total
              </p>
            </StaySummaryCard>

            {/* Guest Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Guest Details
                </CardTitle>
                <CardDescription>Enter the contact information for this reservation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!userId && <GuestCheckoutNote />}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="pl-9" required />
                  </div>
                  <WhatsAppOptIn checked={whatsappOptIn} onCheckedChange={setWhatsappOptIn} disabled={!!bookingCreated} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.doe@example.com" className="pl-9" />
                  </div>
                  <p className="text-xs text-muted-foreground">{GUEST_EMAIL_HINT}</p>
                </div>

                <GstDetailsFields
                  enabled={gstEnabled}
                  onEnabledChange={setGstEnabled}
                  value={gstDetails}
                  onChange={setGstDetails}
                  disabled={!!bookingCreated}
                />
              </CardContent>
            </Card>

            {/* Meal Plans */}
            {mealPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Meal Plans
                  </CardTitle>
                  <CardDescription>Optional — applies to all guests across the stay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MEAL_TYPE_ORDER.map((type) => {
                    const typePlans = mealPlans.filter((mp) => mp.meal_type === type)
                    if (typePlans.length === 0) return null
                    return (
                      <div key={type}>
                        <h4 className="font-medium text-sm text-foreground/80 mb-2">{MEAL_TYPE_LABELS[type]}</h4>
                        <div className="space-y-2">
                          {typePlans.map((mp) => {
                            const isSelected = selectedMealPlanIds.includes(mp.id)
                            const { adultCost, childCost, total } = mealPlanCost(mp, numAdults, childrenAges, numNights > 0 ? numNights : 1)
                            const childCount = childrenAges.filter((a) => childMealCategory(a) === 'child').length
                            return (
                              <label key={mp.id} className={cn('flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors', isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80')}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    setSelectedMealPlanIds((prev) =>
                                      checked ? [...prev, mp.id] : prev.filter((id) => id !== mp.id)
                                    )
                                  }
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{mp.name}</span>
                                    <span className="text-sm font-semibold text-primary">₹{mp.price_per_person.toLocaleString('en-IN')}/adult</span>
                                  </div>
                                  {mp.description && <p className="text-xs text-muted-foreground mt-0.5">{mp.description}</p>}
                                  <div className="mt-1 space-y-0.5">
                                    {mp.child_price_per_person != null && (
                                      <p className="text-xs text-muted-foreground">₹{mp.child_price_per_person.toLocaleString('en-IN')}/child (6–11) · Infants (0–5) free</p>
                                    )}
                                    {numNights > 0 && (numAdults + numChildren) > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        ₹{adultCost.toLocaleString('en-IN')} adults
                                        {childCount > 0 && ` + ₹${childCost.toLocaleString('en-IN')} children`}
                                        {' '}for {numNights} night{numNights !== 1 ? 's' : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Special Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Special Requests</CardTitle>
                <CardDescription>Optional — any preferences or requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Early check-in, extra pillows, adjoining rooms, etc."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">Subject to availability and cannot be guaranteed</p>
              </CardContent>
            </Card>

            {/* Cancellation & refund terms (the pay step is in the price box on the right) */}
            <CancellationPolicyNotice />
          </div>
        </form>
      </div>

      {/* ── Right: price breakup only (hotel, dates, guests are on the left) ── */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PriceBreakupCard
            ready={numNights > 0}
            total={grandTotal}
            lines={[
              ...selectionPricing.map(({ room, qty, subtotal, nights }) => ({
                label: `${room.name} · ${qty} ${qty === 1 ? 'room' : 'rooms'} × ${numNights} ${numNights === 1 ? 'night' : 'nights'}`,
                amount: subtotal,
                detail: nights.some((n) => n.price !== room.base_price) ? (
                  <div className="space-y-0.5">
                    {nights.map((n) => (
                      <div key={n.date} className="flex justify-between gap-3">
                        <span>
                          {format(new Date(`${n.date}T00:00:00`), 'EEE, d MMM')}
                          {n.label ? ` · ${n.label}` : ''}
                        </span>
                        <span>₹{n.price.toLocaleString('en-IN')}/night</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  `₹${room.base_price.toLocaleString('en-IN')} per room per night`
                ),
              })),
              ...selectedMealPlans.map((mp) => ({
                label: mp.name,
                amount: mealPlanCost(mp, numAdults, childrenAges, numNights).total,
              })),
              ...(extraBedCharge > 0 ? [{ label: 'Extra bed / guest charge', amount: extraBedCharge }] : []),
            ]}
            taxes={[
              { label: 'GST on rooms', amount: roomGstTotal },
              ...(mealGstAmount > 0 ? [{ label: 'GST on meals (5%)', amount: mealGstAmount }] : []),
              { label: 'Service charge (6%)', amount: serviceCharge },
              { label: 'GST on service charge (18%)', amount: gstOnServiceCharge },
            ]}
          >
            {/* Pay step: right beside the total */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!bookingCreated ? (
              <>
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="terms-multi-booking"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <label htmlFor="terms-multi-booking" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Terms
                    </a>
                    ,{' '}
                    <a href="/privacy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Privacy
                    </a>{' '}
                    and{' '}
                    <a href="/refund-policy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Refund Policy
                    </a>
                    , and the cancellation terms and house rules.
                  </label>
                </div>
                <Button
                  type="submit"
                  form="multi-booking-form"
                  size="lg"
                  className="h-12 w-full rounded-xl text-base font-bold"
                  disabled={isSubmitting || !checkInDate || !checkOutDate || !termsAccepted}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your booking…
                    </>
                  ) : (
                    'Proceed to payment'
                  )}
                </Button>
                {!termsAccepted && checkInDate && checkOutDate && (
                  <p className="text-center text-[11px] text-muted-foreground">Tick the box above to continue</p>
                )}
              </>
            ) : (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {bookingCreated.bookingIds.length} {bookingCreated.bookingIds.length === 1 ? 'booking' : 'bookings'} created · Reference{' '}
                    <strong>{bookingCreated.primaryBookingReference}</strong>
                  </AlertDescription>
                </Alert>
                <PayButton
                  amount={bookingCreated.totalAmount}
                  checkout={checkout}
                  onPay={() => openPayment(bookingCreated)}
                />
                <p className="text-center text-xs text-muted-foreground">
                  {paymentClosed
                    ? 'Payment window closed. Your booking is held, pay now to confirm it.'
                    : 'Complete the payment to confirm your booking'}
                </p>
              </>
            )}
          </PriceBreakupCard>
        </div>
      </div>
    </div>
  )
}
