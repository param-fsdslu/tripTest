import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/db/server'
import { guestAccessHash, saveGuestStay } from '@/lib/services/guest-checkout.service'
import { normalizeIndianMobile } from '@/lib/utils/phone'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { isValidEmail, isValidPhone, parseGstDetails, type GstDetailsInput, getRoomGstRate, MEAL_GST_RATE, isWithinBookingWindow, MAX_BOOKING_MONTHS_AHEAD, calculateExtraBedCharge, calculateRoomStayPricing, type PriceRuleInput } from '@/lib/utils'

/**
 * POST /api/bookings/multi
 *
 * Creates one booking record per room type in a single request, sharing the same
 * guest info, dates, and guests.  Room GST is computed per-room-type based on each
 * room's base_price slab (0% / 5% / 18%).  Meal GST is a flat 5% on the meal total.
 * The last booking absorbs any rounding residual so that sum(total_amount) == grand total.
 *
 * Returns { bookingIds, primaryBookingReference, totalAmount } on success.
 */

interface RoomSelection {
  roomTypeId: string
  numRooms: number
}

interface BookingMealPlan {
  mealPlanId: string
  mealType: string
  name: string
  pricePerPerson: number
  childPricePerPerson?: number
  numGuests: number
  numNights: number
  totalAmount: number
}

interface MultiBookingBody {
  userId?: string
  hotelId: string
  rooms: RoomSelection[]
  guestFirstName: string
  guestLastName: string
  guestEmail?: string
  /** Optional GST details for a company invoice */
  gstDetails?: GstDetailsInput
  /** The guest agreed to booking messages on WhatsApp */
  whatsappOptIn?: boolean
  guestPhone: string
  checkInDate: string
  checkOutDate: string
  numAdults: number
  numChildren: number
  childrenAges?: number[]
  specialRequests?: string
  mealPlanTotal?: number
  mealPlans?: BookingMealPlan[]
}

const handler = async (request: NextRequest) => {
  try {
    const body: MultiBookingBody = await request.json()

    // ── Basic validation ────────────────────────────────────────────────────
    if (!body.hotelId || !body.rooms?.length) {
      return NextResponse.json(
        { error: 'Missing hotel or room information' },
        { status: 400 }
      )
    }

    // Email is optional: a guest can book with just a mobile number
    if (!body.guestFirstName || !body.guestLastName || !body.guestPhone) {
      return NextResponse.json(
        { error: 'Missing required guest information' },
        { status: 400 }
      )
    }

    if (body.guestEmail && !isValidEmail(body.guestEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Optional GST details: stored on every booking of the group, for the property's invoice
    const gst = parseGstDetails(body.gstDetails)
    if (!gst.ok) {
      return NextResponse.json({ error: gst.error }, { status: 400 })
    }

    if (!isValidPhone(body.guestPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number' },
        { status: 400 }
      )
    }

    if (!body.checkInDate || !body.checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required date information' },
        { status: 400 }
      )
    }

    if (!isWithinBookingWindow(body.checkInDate)) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${MAX_BOOKING_MONTHS_AHEAD} months in advance` },
        { status: 400 }
      )
    }

    const db = await createClient()
    const admin = createAdminClient()

    // The account comes from the session, never the request body. No session = guest checkout:
    // the booking is kept under the mobile number and only this browser can pay for it.
    const {
      data: { user },
    } = await db.auth.getUser()
    const guestPhone = normalizeIndianMobile(body.guestPhone) ?? body.guestPhone
    const guestAccess = user ? null : await guestAccessHash()
    // Guest rows are hidden by row policies, so they're written with the admin client
    const writer = user ? db : admin

    // ── Fetch & validate all room types ─────────────────────────────────────
    const roomTypeIds = body.rooms.map((r) => r.roomTypeId)

    const { data: roomTypes, error: rtError } = await db
      .from('room_types')
      .select('id, name, base_price, num_available_rooms, hotel_id, standard_occupancy, max_occupancy, extra_bed_price')
      .in('id', roomTypeIds)
      .eq('hotel_id', body.hotelId)
      .eq('status', 'available')

    if (rtError || !roomTypes || roomTypes.length !== roomTypeIds.length) {
      return NextResponse.json(
        { error: 'One or more room types not found or unavailable' },
        { status: 400 }
      )
    }

    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]))

    // ── Availability check per room type ─────────────────────────────────────
    for (const selection of body.rooms) {
      const rt = roomTypeMap.get(selection.roomTypeId)!

      // Everyone's bookings count, not just the ones the caller may read
      const { data: overlapping } = await admin
        .from('bookings')
        .select('num_rooms')
        .eq('room_type_id', selection.roomTypeId)
        .in('booking_status', ['confirmed', 'pending'])
        .in('payment_status', ['paid', 'pending', 'processing'])
        .lt('check_in_date', body.checkOutDate)
        .gt('check_out_date', body.checkInDate)

      const bookedRooms = (overlapping || []).reduce((s, b) => s + (b.num_rooms || 1), 0)

      // Also subtract rooms blocked by inventory blocks that overlap the requested dates
      const { data: inventoryBlocks } = await db
        .from('room_inventory_blocks')
        .select('rooms_blocked')
        .eq('room_type_id', selection.roomTypeId)
        .lte('start_date', body.checkOutDate)
        .gte('end_date', body.checkInDate)

      const blockedRooms = (inventoryBlocks || []).reduce(
        (s, b: { rooms_blocked: number }) => s + (b.rooms_blocked || 0), 0
      )
      const available = (rt.num_available_rooms || 0) - bookedRooms - blockedRooms

      if (selection.numRooms > available) {
        const msg =
          available <= 0
            ? `No ${rt.name} rooms available for the selected dates`
            : `Only ${available} ${rt.name} room${available === 1 ? '' : 's'} available for the selected dates`
        return NextResponse.json({ error: msg }, { status: 409 })
      }
    }

    // ── Pricing: per-room-type GST (slab based on each room's base_price) ────
    const checkIn = new Date(body.checkInDate)
    const checkOut = new Date(body.checkOutDate)
    const nights = Math.ceil(
      Math.abs(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    const mealPlanTotal = body.mealPlanTotal || 0

    // Weekend/festival/long-weekend/custom price rules — fetched server-side
    // and applied authoritatively; the client's dates are never trusted for pricing.
    const { data: priceRulesData } = await db
      .from('price_rules')
      .select('*')
      .in('room_type_id', roomTypeIds)
      .eq('is_active', true)
      .lte('valid_from', body.checkOutDate)
      .gte('valid_to', body.checkInDate)
    const priceRules = (priceRulesData || []) as PriceRuleInput[]

    // Per-room-type breakdown: subtotal (nightly rates resolved), GST rate, and tax components
    const roomBreakdowns = body.rooms.map((sel) => {
      const rt = roomTypeMap.get(sel.roomTypeId)!
      const { subtotal } = calculateRoomStayPricing(rt, body.checkInDate, body.checkOutDate, sel.numRooms, priceRules)
      const gstRate = getRoomGstRate(rt.base_price)
      const gstAmount = subtotal * gstRate
      const serviceCharge = subtotal * 0.06
      const gstOnServiceCharge = serviceCharge * 0.18
      const totalTax = gstAmount + serviceCharge + gstOnServiceCharge
      return { subtotal, gstRate, gstAmount, serviceCharge, gstOnServiceCharge, totalTax }
    })

    const mealGst = mealPlanTotal * MEAL_GST_RATE

    const extraBedCharge = calculateExtraBedCharge(
      body.rooms.map((sel) => {
        const rt = roomTypeMap.get(sel.roomTypeId)!
        return {
          qty: sel.numRooms,
          standardOccupancy: rt.standard_occupancy,
          maxOccupancy: rt.max_occupancy,
          extraBedPrice: rt.extra_bed_price,
        }
      }),
      body.numAdults + body.numChildren,
      nights
    )

    const grandTotal =
      roomBreakdowns.reduce((s, r) => s + r.subtotal + r.totalTax, 0) +
      mealPlanTotal + mealGst + extraBedCharge

    // ── Create booking records ────────────────────────────────────────────────
    const bookingIds: string[] = []
    let primaryBookingReference = ''
    let runningTotal = 0

    for (let i = 0; i < body.rooms.length; i++) {
      const selection = body.rooms[i]
      const bd = roomBreakdowns[i]

      // Meal plan total (and its GST) and the extra-bed charge are attached to the first booking only
      const thisMealPlanTotal = i === 0 ? mealPlanTotal : 0
      const thisMealGst = i === 0 ? mealGst : 0
      const thisExtraBedCharge = i === 0 ? extraBedCharge : 0

      // Last booking absorbs any rounding residual to ensure exact grand total
      const thisBase = bd.subtotal + thisMealPlanTotal + thisExtraBedCharge
      const thisPreTotal = Math.round((thisBase + bd.totalTax + thisMealGst) * 100) / 100
      const isLast = i === body.rooms.length - 1
      const thisTotal = isLast
        ? Math.round((grandTotal - runningTotal) * 100) / 100
        : thisPreTotal

      const thisGstAmount = Math.round((bd.gstAmount + thisMealGst) * 100) / 100
      const thisServiceCharge = Math.round(bd.serviceCharge * 100) / 100
      const thisGstOnSC = Math.round(bd.gstOnServiceCharge * 100) / 100

      // Generate unique booking reference
      const reference = await generateBookingReference(admin)
      if (i === 0) primaryBookingReference = reference

      const { data: booking, error: insertError } = await writer
        .from('bookings')
        .insert({
          booking_reference: reference,
          user_id: user?.id ?? null,
          guest_access_hash: guestAccess,
          hotel_id: body.hotelId,
          room_type_id: selection.roomTypeId,
          guest_first_name: body.guestFirstName,
          guest_last_name: body.guestLastName,
          guest_email: body.guestEmail?.trim() || null,
          guest_phone: guestPhone,
          whatsapp_opt_in: body.whatsappOptIn === true,
          ...gst.value,
          check_in_date: body.checkInDate,
          check_out_date: body.checkOutDate,
          num_adults: body.numAdults,
          num_children: body.numChildren,
          num_rooms: selection.numRooms,
          price_per_night: Math.round((bd.subtotal / nights / selection.numRooms) * 100) / 100,
          tax_amount: thisGstAmount,
          service_fee: thisServiceCharge + thisGstOnSC,
          meal_plan_total: thisMealPlanTotal,
          extra_bed_charge: thisExtraBedCharge,
          total_amount: thisTotal,
          special_requests: body.specialRequests || null,
          booking_status: 'pending',
          payment_status: 'pending',
        })
        .select('id, booking_reference')
        .single()

      if (insertError || !booking) {
        // Rollback previously created bookings
        if (bookingIds.length > 0) {
          await writer.from('bookings').delete().in('id', bookingIds)
        }
        console.error('Error creating booking:', insertError)
        return NextResponse.json(
          { error: 'Failed to create booking. Please try again.' },
          { status: 500 }
        )
      }

      bookingIds.push(booking.id)
      runningTotal += thisTotal

      // Attach meal plan detail rows to the primary booking only
      if (i === 0 && body.mealPlans && body.mealPlans.length > 0) {
        const rows = body.mealPlans.map((mp) => ({
          booking_id: booking.id,
          meal_plan_id: mp.mealPlanId,
          meal_type: mp.mealType,
          name: mp.name,
          price_per_person: mp.pricePerPerson,
          num_guests: mp.numGuests,
          num_nights: mp.numNights,
          total_amount: mp.totalAmount,
        }))

        const { error: mpError } = await writer.from('booking_meal_plans').insert(rows)
        if (mpError) {
          console.error('Error inserting meal plans (non-fatal):', mpError)
        }
      }
    }

    // Guests: keep the rooms under their number too, so they're there after signing in with it
    if (!user && guestPhone.startsWith('+')) {
      await saveGuestStay({
        phone: guestPhone,
        hotelId: body.hotelId,
        rooms: body.rooms.map((r) => ({ roomId: r.roomTypeId, qty: r.numRooms })),
        checkIn: body.checkInDate,
        checkOut: body.checkOutDate,
        adults: body.numAdults,
        children: body.numChildren,
      })
    }

    return NextResponse.json(
      {
        success: true,
        bookingIds,
        primaryBookingReference,
        totalAmount: grandTotal,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Multi-booking API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateBookingReference(db: any): Promise<string> {
  let reference: string
  let exists = true

  while (exists) {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    reference = `BK-${dateStr}-${randomStr}`

    const { data } = await db
      .from('bookings')
      .select('id')
      .eq('booking_reference', reference)
      .single()

    exists = !!data
  }

  return reference!
}

export const POST = withApiLogging(handler, 'bookings/multi')
