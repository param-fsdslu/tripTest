'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  User,
  Mail,
  Phone,
  Users,
  Baby,
  BedDouble,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CreditCard,
  UtensilsCrossed,
  Info,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { cn, calculateBookingTax, isValidPhone, calculateExtraBedCharge, calculateRoomStayPricing, type PriceRuleInput } from '@/lib/utils'
import type { MealPlan, MealType } from '@/lib/types'
import { formatPhone } from '@/lib/utils/phone'
import { saveStay } from '@/lib/actions/saved-stays'

/** Email is optional: a guest can book with just a mobile number and find the booking by signing in with it */
export const GUEST_EMAIL_HINT =
  "We'll email your confirmation here. Without one, sign in with your mobile number to see the booking in My Bookings."

/** Shown on the review page without a session: booking needs no account (guest checkout) */
export function GuestCheckoutNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-mint px-3.5 py-3 text-sm text-secondary">
      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        <span className="font-semibold">No account needed.</span> Add your name and mobile number. Your booking is kept
        under that number: sign in with it any time to see or manage it.
      </p>
    </div>
  )
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

/** Classify a child age into meal pricing category. */
function childMealCategory(age: number): 'infant' | 'child' | 'adult' {
  if (age <= 5) return 'infant'   // 0–5: no meal charge
  if (age <= 11) return 'child'   // 6–11: child price
  return 'adult'                   // 12+: adult price
}

/**
 * Compute the total cost for a single meal plan, split by guest age group.
 * Falls back to adult price for children when child_price_per_person is not set.
 */
function mealPlanCost(
  mp: MealPlan,
  numAdults: number,
  childrenAges: number[],
  numNights: number
): { adultCost: number; childCost: number; total: number } {
  const childrenFromAges = childrenAges.filter((a) => childMealCategory(a) === 'child').length
  const adultsFromChildren = childrenAges.filter((a) => childMealCategory(a) === 'adult').length
  const totalAdultGuests = numAdults + adultsFromChildren

  const childUnitPrice = mp.child_price_per_person ?? mp.price_per_person

  const adultCost = mp.price_per_person * totalAdultGuests * numNights
  const childCost = childUnitPrice * childrenFromAges * numNights

  return { adultCost, childCost, total: adultCost + childCost }
}

interface Room {
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
  room_type_images?: Array<{
    image_url: string
    alt_text?: string
  }>
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

interface BookingFormProps {
  hotel: Hotel
  room: Room
  mealPlans?: MealPlan[]
  priceRules?: PriceRuleInput[]
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

export function BookingForm({ hotel, room, mealPlans = [], priceRules = [], userId, userEmail, userName, userPhone, initialCheckIn, initialCheckOut, initialAdults, initialChildren, initialPets }: BookingFormProps) {
  const router = useRouter()
  const savedGuest = useBookingStore((s) => s.guestDetails)
  const setGuestDetails = useBookingStore((s) => s.setGuestDetails)
  const hydrated = useBookingHydration()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Guest Details — auth props take priority, then stored guest details
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
      rooms: [{ roomId: room.id, qty: 1 }],
      checkIn: initialCheckIn ? format(initialCheckIn, 'yyyy-MM-dd') : undefined,
      checkOut: initialCheckOut ? format(initialCheckOut, 'yyyy-MM-dd') : undefined,
      adults: initialAdults,
      children: initialChildren,
      pets: initialPets,
    }).catch(() => {})
    // Once per visit to the review page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id, room.id])

  // Hydrate from persisted guest details only after localStorage rehydration completes
  useEffect(() => {
    if (!hydrated) return
    if (!firstName && savedGuest.firstName) setFirstName(savedGuest.firstName)
    if (!lastName && savedGuest.lastName) setLastName(savedGuest.lastName)
    if (!email && savedGuest.email) setEmail(savedGuest.email)
    if (!phone && savedGuest.phone) setPhone(savedGuest.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Booking Details — pre-filled from search store via URL params
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(initialCheckIn)
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(initialCheckOut)
  const [numAdults, setNumAdults] = useState(initialAdults ?? 1)
  const [numChildren, setNumChildren] = useState(initialChildren ?? 0)
  const [withPets, setWithPets] = useState(initialPets ?? false)
  const [childrenAges, setChildrenAges] = useState<number[]>([])
  const [numRooms, setNumRooms] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(true)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstDetails, setGstDetails] = useState(EMPTY_GST_DETAILS)
  const [selectedMealPlanIds, setSelectedMealPlanIds] = useState<string[]>([])

  // Keep childrenAges in sync with numChildren (add/remove slots)
  useEffect(() => {
    setChildrenAges((prev) => {
      if (numChildren > prev.length) {
        return [...prev, ...Array(numChildren - prev.length).fill(0)]
      }
      return prev.slice(0, numChildren)
    })
  }, [numChildren])

  // ── Pricing calculations ─────────────────────────────────────────────────
  const numNights = checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0
  const checkInStr = checkInDate ? format(checkInDate, 'yyyy-MM-dd') : ''
  const checkOutStr = checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : ''
  const { subtotal: baseSubtotal, nights: nightlyPrices } =
    checkInStr && checkOutStr
      ? calculateRoomStayPricing(room, checkInStr, checkOutStr, numRooms, priceRules)
      : { subtotal: 0, nights: [] as ReturnType<typeof calculateRoomStayPricing>['nights'] }
  const hasDynamicPricing = nightlyPrices.some((n) => n.price !== room.base_price)

  const selectedMealPlans = mealPlans.filter((mp) => selectedMealPlanIds.includes(mp.id))

  const mealPlanTotal = selectedMealPlans.reduce((sum, mp) => {
    return sum + mealPlanCost(mp, numAdults, childrenAges, numNights).total
  }, 0)

  const tax = calculateBookingTax(room.base_price, baseSubtotal, mealPlanTotal)

  const extraBedCharge = calculateExtraBedCharge(
    [{
      qty: numRooms,
      standardOccupancy: room.standard_occupancy,
      maxOccupancy: room.max_occupancy,
      extraBedPrice: room.extra_bed_price,
    }],
    numAdults + numChildren,
    numNights
  )

  const grandTotal = tax.totalAmount + extraBedCharge

  const guestsLabel = [
    `${numAdults} ${numAdults === 1 ? 'Adult' : 'Adults'}`,
    numChildren > 0 ? `${numChildren} ${numChildren === 1 ? 'Child' : 'Children'}` : null,
    `${numRooms} ${numRooms === 1 ? 'Room' : 'Rooms'}`,
    withPets ? 'With pets' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const [bookingCreated, setBookingCreated] = useState<{
    bookingId: string
    bookingReference: string
  } | null>(null)

  // "Proceed to payment" creates the booking and opens Razorpay in one go; the Pay button below is for retries
  const checkout = useRazorpayCheckout()
  const [paymentClosed, setPaymentClosed] = useState(false)

  const openPayment = (booking: { bookingId: string; bookingReference: string }) => {
    setError(null)
    setPaymentClosed(false)
    return checkout.startPayment(
      {
        bookingIds: [booking.bookingId],
        bookingReference: booking.bookingReference,
        guestName: `${firstName} ${lastName}`,
        guestEmail: email,
        guestPhone: phone,
      },
      { onDismiss: () => setPaymentClosed(true), onError: setError }
    )
  }

  const handleChildAgeChange = (index: number, age: number) => {
    setChildrenAges((prev) => {
      const next = [...prev]
      next[index] = age
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!termsAccepted) {
        throw new Error('Please accept the Terms & Conditions, Privacy Policy, and Refund Policy to continue')
      }
      if (!isValidPhone(phone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number')
      }
      const gstError = gstDetailsError(gstEnabled, gstDetails)
      if (gstError) throw new Error(gstError)
      if (!checkInDate || !checkOutDate) {
        throw new Error('Please select check-in and check-out dates')
      }
      if (numNights < 1) {
        throw new Error('Check-out date must be after check-in date')
      }
      if (numAdults < 1) {
        throw new Error('At least one adult is required')
      }
      if (numAdults + numChildren > room.max_occupancy * numRooms) {
        throw new Error(`Maximum occupancy exceeded for ${numRooms} room(s)`)
      }

      const bookingData = {
        userId,
        hotelId: hotel.id,
        roomTypeId: room.id,
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
        numRooms,
        pricePerNight: numNights > 0 ? Math.round((baseSubtotal / numNights / numRooms) * 100) / 100 : room.base_price,
        taxAmount: tax.gstAmount + tax.mealGstAmount,
        serviceFee: tax.serviceCharge + tax.gstOnServiceCharge,
        extraBedCharge,
        totalAmount: grandTotal,
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

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create booking')

      setGuestDetails({ firstName, lastName, email, phone })
      const created = { bookingId: result.bookingId, bookingReference: result.bookingReference }
      setBookingCreated(created)
      setIsSubmitting(false)
      await openPayment(created)
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Booking Form */}
      <div className="lg:col-span-2">
        <form id="booking-form" onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Hotel + stay (dates, guests, room) — MakeMyTrip-style review header */}
            <StaySummaryCard
              hotel={hotel}
              checkIn={checkInDate}
              checkOut={checkOutDate}
              onCheckInChange={setCheckInDate}
              onCheckOutChange={setCheckOutDate}
              guestsLabel={guestsLabel}
              locked={!!bookingCreated}
            >
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">{room.name}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {room.bed_configuration && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      {room.bed_configuration}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Up to {room.max_occupancy} guests per room
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="numAdults">Adults *</Label>
                  <Select
                    value={numAdults.toString()}
                    onValueChange={(v) => setNumAdults(parseInt(v))}
                    disabled={!!bookingCreated}
                  >
                    <SelectTrigger id="numAdults" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: room.max_adults }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {num} {num === 1 ? 'Adult' : 'Adults'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numChildren">Children</Label>
                  <Select
                    value={numChildren.toString()}
                    onValueChange={(v) => setNumChildren(parseInt(v))}
                    disabled={!!bookingCreated}
                  >
                    <SelectTrigger id="numChildren" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: room.max_children + 1 }, (_, i) => i).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Baby className="h-4 w-4" />
                            {num} {num === 1 ? 'Child' : 'Children'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numRooms">Rooms *</Label>
                  <Select
                    value={numRooms.toString()}
                    onValueChange={(v) => setNumRooms(parseInt(v))}
                    disabled={!!bookingCreated}
                  >
                    <SelectTrigger id="numRooms" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(room.num_available_rooms || 5, 5) }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <BedDouble className="h-4 w-4" />
                            {num} {num === 1 ? 'Room' : 'Rooms'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <PetsOptIn checked={withPets} onCheckedChange={setWithPets} policy={hotel.pet_policy_text} disabled={!!bookingCreated} />

              {/* Child age inputs */}
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
                        <Select
                          value={childrenAges[i]?.toString() ?? '0'}
                          onValueChange={(v) => handleChildAgeChange(i, parseInt(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Age" />
                          </SelectTrigger>
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
            </StaySummaryCard>

            {/* Guest Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Guest Details
                </CardTitle>
                <CardDescription>
                  Enter the guest information for this reservation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!userId && <GuestCheckoutNote />}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 91138 87712"
                      className="pl-9"
                      required
                    />
                  </div>
                  <WhatsAppOptIn checked={whatsappOptIn} onCheckedChange={setWhatsappOptIn} disabled={!!bookingCreated} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      className="pl-9"
                    />
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
                  <CardDescription>
                    Optional — Add meals to your stay (pricing varies by age group)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MEAL_TYPE_ORDER.map((type) => {
                    const typePlans = mealPlans.filter((mp) => mp.meal_type === type)
                    if (typePlans.length === 0) return null

                    return (
                      <div key={type}>
                        <h4 className="font-medium text-sm text-foreground/80 mb-2">
                          {MEAL_TYPE_LABELS[type]}
                        </h4>
                        <div className="space-y-2">
                          {typePlans.map((mp) => {
                            const isSelected = selectedMealPlanIds.includes(mp.id)
                            const { adultCost, childCost, total } = mealPlanCost(mp, numAdults, childrenAges, numNights > 0 ? numNights : 1)
                            const childCount = childrenAges.filter((a) => childMealCategory(a) === 'child').length
                            return (
                              <label
                                key={mp.id}
                                className={cn(
                                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-border/80'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedMealPlanIds((prev) =>
                                      checked
                                        ? [...prev, mp.id]
                                        : prev.filter((id) => id !== mp.id)
                                    )
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{mp.name}</span>
                                    <span className="text-sm font-semibold text-primary">
                                      ₹{mp.price_per_person.toLocaleString('en-IN')}/adult
                                    </span>
                                  </div>
                                  {mp.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{mp.description}</p>
                                  )}
                                  <div className="mt-1 space-y-0.5">
                                    {mp.child_price_per_person != null && (
                                      <p className="text-xs text-muted-foreground">
                                        ₹{mp.child_price_per_person.toLocaleString('en-IN')}/child (6–11) · Infants (0–5) free
                                      </p>
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
                <CardDescription>
                  Optional - Any special requirements or preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Early check-in, extra pillows, airport transfer, etc."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Special requests are subject to availability and cannot be guaranteed
                </p>
              </CardContent>
            </Card>

            {/* Cancellation & refund terms (the pay step is in the price box on the right) */}
            <CancellationPolicyNotice />
          </div>
        </form>
      </div>

      {/* Price breakup only — hotel, dates and guests are on the left */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PriceBreakupCard
            ready={numNights > 0}
            total={grandTotal}
            lines={[
              {
                label: `${numRooms} ${numRooms === 1 ? 'room' : 'rooms'} × ${numNights} ${numNights === 1 ? 'night' : 'nights'}`,
                amount: baseSubtotal,
                detail: hasDynamicPricing ? (
                  <div className="space-y-0.5">
                    {nightlyPrices.map((n) => (
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
              },
              ...selectedMealPlans.map((mp) => ({
                label: mp.name,
                amount: mealPlanCost(mp, numAdults, childrenAges, numNights).total,
              })),
              ...(extraBedCharge > 0 ? [{ label: 'Extra bed / guest charge', amount: extraBedCharge }] : []),
            ]}
            taxes={[
              { label: `GST on rooms (${Math.round(tax.gstRate * 100)}%)`, amount: tax.roomGstAmount },
              ...(tax.mealGstAmount > 0 ? [{ label: 'GST on meals (5%)', amount: tax.mealGstAmount }] : []),
              { label: 'Service charge (6%)', amount: tax.serviceCharge },
              { label: 'GST on service charge (18%)', amount: tax.gstOnServiceCharge },
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
                    id="terms-booking"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <label htmlFor="terms-booking" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
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
                  form="booking-form"
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
                    Booking created · Reference <strong>{bookingCreated.bookingReference}</strong>
                  </AlertDescription>
                </Alert>
                <PayButton
                  amount={grandTotal}
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
