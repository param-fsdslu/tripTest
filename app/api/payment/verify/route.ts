import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/db/server'
import { clearGuestStay, findPayableBookings } from '@/lib/services/guest-checkout.service'
import { issueInvoiceNumbers } from '@/lib/services/invoice.service'
import { emailService } from '@/lib/services/email.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'
import { logger } from '@/lib/utils/logger'

const handler = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingType = 'hotel',
    } = body

    // Accept bookingIds (array, multi-room) or bookingId (single, backwards compat)
    const bookingIds: string[] = body.bookingIds?.length
      ? body.bookingIds
      : body.bookingId
      ? [body.bookingId]
      : []

    // Keep bookingId as alias for the primary booking (first in array)
    const bookingId = bookingIds[0]

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters' },
        { status: 400 }
      )
    }

    // Verify the payment signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET!
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Update booking status in database
    const adminDb = createAdminClient() // bypasses row policies for payment record operations

    const isBoatBooking = bookingType === 'boat'
    const tableName = isBoatBooking ? 'boat_bookings' : 'bookings'

    // Ownership: the signed-in owner, or the browser that made a guest booking. `writer` updates the
    // rows: the user's own client, or the admin client for checked guest bookings.
    const access = await findPayableBookings<{
      id: string
      booking_reference: string
      payment_status: string
      booking_status: string
      total_amount: string
    }>(tableName, bookingIds, 'id, booking_reference, payment_status, booking_status, total_amount')
    if (!access) {
      return NextResponse.json({ error: 'Booking not found or unauthorized' }, { status: 403 })
    }
    const { user, writer } = access

    // IDEMPOTENCY: Check if primary booking is already confirmed/paid
    const existingBooking = access.rows.find((b) => b.id === bookingId)

    if (existingBooking?.payment_status === 'paid' && existingBooking?.booking_status === 'confirmed') {
      logger.info('razorpay', `Payment already processed (idempotent): ${razorpay_payment_id}`)
      return NextResponse.json({
        success: true,
        bookingReference: existingBooking.booking_reference,
        message: 'Payment already verified',
        idempotent: true,
      })
    }

    // SECURITY: Verify payment amount with Razorpay before confirming
    try {
      logger.network('razorpay', 'GET', `payments/${razorpay_payment_id}`)
      const payment = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`
        }
      })
      const paymentData = await payment.json()
      logger.info('razorpay', 'Payment fetched for verification', {
        status: paymentData.status,
        amount: paymentData.amount,
      })

      // Sum all booking amounts — must equal Razorpay paid amount
      const totalExpected = access.rows.reduce(
        (sum, b) => sum + parseFloat(b.total_amount),
        0
      )
      const expectedAmount = Math.round(totalExpected * 100) // in paise
      const paidAmount = paymentData.amount // in paise

      if (paidAmount !== expectedAmount) {
        console.error(`Payment amount mismatch: Expected ${expectedAmount}, got ${paidAmount}`)
        return NextResponse.json(
          { error: 'Payment amount does not match booking amount' },
          { status: 400 }
        )
      }
    } catch (verifyError) {
      console.error('Error verifying payment with Razorpay:', verifyError)
      return NextResponse.json(
        { error: 'Failed to verify payment details' },
        { status: 500 }
      )
    }

    // Mark ALL bookings as paid
    const updateData: any = {
      payment_status: 'paid',
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      booking_status: 'confirmed',
      updated_at: new Date().toISOString(),
    }

    const selectQuery = isBoatBooking
      ? `*, boat:boats(name), trip_type:trip_types(name)`
      : `*, hotel:hotels(id, name, email, owner_id), room_type:room_types(name)`

    // Update primary booking (fetched for email details)
    const { data: primaryBooking, error: primaryUpdateError } = await writer
      .from(tableName)
      .update(updateData)
      .eq('id', bookingId)
      .select(selectQuery)
      .single()

    if (primaryUpdateError || !primaryBooking) {
      logger.error('payment/verify', 'Failed to update primary booking', primaryUpdateError, { bookingId })
      return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
    }

    // Update remaining bookings (if multi-room)
    const additionalIds = bookingIds.filter((id) => id !== bookingId)
    if (additionalIds.length > 0) {
      const { error: additionalError } = await writer
        .from(tableName)
        .update(updateData)
        .in('id', additionalIds)

      if (additionalError) {
        logger.error('payment/verify', 'Failed to update additional bookings', additionalError, { additionalIds })
        // Non-fatal for payment confirmation — log but proceed
      }
    }

    // Create payment record for the primary booking (non-blocking)
    const paymentRecord: any = {
      payment_gateway: 'razorpay',
      payment_gateway_order_id: razorpay_order_id,
      payment_gateway_payment_id: razorpay_payment_id,
      amount: primaryBooking.total_amount,
      currency: primaryBooking.currency || 'INR',
      status: 'success',
      payment_method: 'online',
    }
    if (isBoatBooking) {
      paymentRecord.boat_booking_id = bookingId
    } else {
      paymentRecord.booking_id = bookingId
    }
    adminDb.from('payments').insert(paymentRecord).then(({ error: paymentInsertError }) => {
      if (paymentInsertError) {
        logger.error('payment', 'Failed to insert payment record', paymentInsertError, { bookingId })
      }
    })

    // Paid: every booking gets its invoice number from the financial-year series
    if (!isBoatBooking) await issueInvoiceNumbers(bookingIds)

    // Paid: the rooms saved for this hotel (on the account, or under a guest's number) are done with
    if (!isBoatBooking && primaryBooking.hotel_id) {
      if (user) {
        writer.from('saved_stays').delete().eq('user_id', user.id).eq('hotel_id', primaryBooking.hotel_id).then(({ error }) => {
          if (error) logger.error('payment/verify', 'Failed to clear saved stay', error, { bookingId })
        })
      } else {
        clearGuestStay(primaryBooking.guest_phone, primaryBooking.hotel_id)
      }
    }

    // Guests who booked with just a mobile number may have no email anywhere: skip the receipt then
    const guestEmail: string | null = primaryBooking.guest_email || user?.email || null
    const guestName =
      [primaryBooking.guest_first_name, primaryBooking.guest_last_name].filter(Boolean).join(' ') ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      guestEmail?.split('@')[0] ||
      'Guest'

    // Send payment receipt email (fire-and-forget)
    const emailPayload = {
      to: guestEmail ?? '',
      userName: guestName,
      bookingId: primaryBooking.booking_reference,
      paymentId: razorpay_payment_id,
      amount: primaryBooking.total_amount,
      paymentMethod: 'Razorpay (Online)',
      hotelName: isBoatBooking
        ? (primaryBooking.boat?.name || 'Boat Trip')
        : (primaryBooking.hotel?.name || 'Hotel'),
      checkInDate: isBoatBooking ? primaryBooking.trip_date : primaryBooking.check_in_date,
      checkOutDate: isBoatBooking ? primaryBooking.trip_date : primaryBooking.check_out_date,
    }
    if (guestEmail) {
      emailService.sendPaymentReceipt(emailPayload).catch((emailError) => {
        console.error('Failed to send payment receipt email:', emailError)
      })
    }

    // Send hotel owner booking alert (hotel bookings only, runs after response via after())
    logger.always('email', 'Hotel owner alert eligibility check', {
      bookingId,
      isBoatBooking,
      hasHotelRelation: !!primaryBooking.hotel,
    })
    if (!isBoatBooking && primaryBooking.hotel) {
      after(async () => {
        try {
          const hotel = primaryBooking.hotel as { id: string; name: string; email?: string; owner_id?: string }

          // Resolve owner email: hotel.email takes priority (the hotel's own contact
          // address), falling back to the linked owner_id's auth.users email.
          let ownerEmail: string | null = hotel.email ?? null
          if (!ownerEmail && hotel.owner_id) {
            const { data: ownerUser, error: ownerLookupError } = await adminDb.auth.admin.getUserById(hotel.owner_id)
            if (ownerLookupError) {
              logger.always('email', 'Failed to look up hotel owner by owner_id', { hotelId: hotel.id, ownerId: hotel.owner_id, error: ownerLookupError.message })
            }
            ownerEmail = ownerUser?.user?.email ?? null
          }

          if (!ownerEmail) {
            logger.always('email', 'No owner email found for hotel owner alert — set hotel.owner_id or hotel.email', {
              hotelId: hotel.id,
              hotelOwnerId: hotel.owner_id ?? null,
              hotelEmailColumn: hotel.email ?? null,
            })
            return
          }

          logger.always('email', 'Resolved hotel owner alert recipient', {
            hotelId: hotel.id,
            resolvedVia: hotel.email ? 'hotel.email column' : 'owner_id (auth.users)',
            ownerEmail,
          })

          const sendResult = await emailService.sendHotelOwnerBookingAlert({
            to: ownerEmail,
            hotelName: hotel.name,
            bookingId: primaryBooking.booking_reference,
            guestName,
            guestEmail: guestEmail ?? undefined,
            guestPhone: primaryBooking.guest_phone ?? undefined,
            gst: primaryBooking.gst_number
              ? {
                  number: primaryBooking.gst_number,
                  companyName: primaryBooking.gst_company_name,
                  companyAddress: primaryBooking.gst_company_address,
                }
              : null,
            checkInDate: primaryBooking.check_in_date,
            checkOutDate: primaryBooking.check_out_date,
            numAdults: primaryBooking.num_adults || 1,
            numChildren: primaryBooking.num_children || 0,
            numRooms: primaryBooking.num_rooms || 1,
            roomTypeName: primaryBooking.room_type?.name || 'Room',
            totalAmount: primaryBooking.total_amount,
            specialRequests: primaryBooking.special_requests || undefined,
          })

          logger.always('email', 'Hotel owner alert send result', {
            bookingId,
            ownerEmail,
            success: sendResult.success,
            error: sendResult.success ? undefined : sendResult.error,
          })
        } catch (err) {
          logger.error('email', 'Failed to send hotel owner booking alert', err, { bookingId })
        }
      })
    }

    return NextResponse.json({
      success: true,
      bookingReference: primaryBooking.booking_reference,
      message: 'Payment verified successfully',
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(handler, 'payment/verify')
