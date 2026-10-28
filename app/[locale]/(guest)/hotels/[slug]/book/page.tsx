import { Navbar } from '@/components/Navbar'
import { BookingForm } from '@/components/booking/BookingForm'
import { MultiRoomBookingForm } from '@/components/booking/MultiRoomBookingForm'
import { createAdminClient, createClient } from '@/lib/db/server'
import { redirect } from '@/i18n/routing'
import { HotelService } from '@/lib/services/hotel.service'
import type { PriceRule } from '@/lib/types'

/**
 * Fetches active weekend/festival/long-weekend/custom price rules for the given
 * room types, so the booking form can price any date the guest picks (up to the
 * 6-month booking window) without another round trip as they change dates.
 */
async function fetchPriceRules(
  db: Awaited<ReturnType<typeof createClient>>,
  roomTypeIds: string[]
): Promise<PriceRule[]> {
  if (roomTypeIds.length === 0) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await db
    .from('price_rules')
    .select('*')
    .in('room_type_id', roomTypeIds)
    .eq('is_active', true)
    .gte('valid_to', today)
  return data || []
}

/**
 * /hotels/[slug]/book
 *
 * Supports two query-param shapes:
 *   ?roomId=<uuid>                        — single-room (backwards-compat)
 *   ?rooms=<uuid>:<qty>,<uuid>:<qty>,...  — multi-room checkout
 *
 * Single-room renders BookingForm; multi-room renders MultiRoomBookingForm.
 */

function parseRoomsParam(rooms: string): Array<{ roomTypeId: string; numRooms: number }> {
  return rooms
    .split(',')
    .map((part) => {
      const [id, qty] = part.split(':')
      return { roomTypeId: id?.trim(), numRooms: parseInt(qty) || 1 }
    })
    .filter((r) => !!r.roomTypeId)
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>
  searchParams: Promise<{ roomId?: string; rooms?: string; checkIn?: string; checkOut?: string; adults?: string; children?: string; pets?: string }>
}) {
  const { slug } = await params
  const { roomId, rooms: roomsParam, checkIn, checkOut, adults, children, pets } = await searchParams

  const initialCheckIn = checkIn ? new Date(checkIn) : undefined
  const initialCheckOut = checkOut ? new Date(checkOut) : undefined
  const initialAdults = adults ? parseInt(adults) : undefined
  const initialChildren = children ? parseInt(children) : undefined
  const initialPets = pets === '1'

  // Determine mode: multi-room takes priority over single roomId
  const isMultiRoom = !!roomsParam
  const roomSelections = isMultiRoom ? parseRoomsParam(roomsParam!) : []

  // Must have at least one room selection
  if (!isMultiRoom && !roomId) {
    redirect({ href: `/hotels/${slug}`, locale: 'en' })
  }
  if (isMultiRoom && roomSelections.length === 0) {
    redirect({ href: `/hotels/${slug}`, locale: 'en' })
  }

  const db = await createClient()

  // No sign-in needed: without a session this is a guest checkout (name + mobile number), kept
  // under that number until the guest signs in with it (lib/services/guest-checkout.service.ts)
  const {
    data: { user },
  } = await db.auth.getUser()
  // Availability counts everyone's bookings, which only the admin client can see
  const adminDb = createAdminClient()

  // Fetch hotel details
  const { data: hotel, error: hotelError } = await db
    .from('hotels')
    .select(
      'id, name, address_line_1, city, state, star_rating, check_in_from_time, check_out_time, pet_policy_text, ' +
        'hotel_images!hotel_images_hotel_id_fkey(image_url, is_primary, display_order)'
    )
    .eq('slug', slug)
    .single()

  if (hotelError || !hotel) {
    redirect({ href: `/hotels/${slug}`, locale: 'en' })
    return
  }

  // Main photo for the review card (primary first, then display order)
  const photos = [...((hotel as any).hotel_images ?? [])].sort(
    (x: any, y: any) => Number(!!y.is_primary) - Number(!!x.is_primary) || (x.display_order ?? 0) - (y.display_order ?? 0)
  )
  const hotelSummary = { ...hotel, image_url: photos[0]?.image_url ?? null }

  // Fetch active meal plans for this hotel
  const { data: mealPlans } = await db
    .from('meal_plans')
    .select('*')
    .eq('hotel_id', hotel.id)
    .eq('status', 'active')
    .order('meal_type')
    .order('name')

  const userName =
    user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : undefined

  // ── Multi-room path ──────────────────────────────────────────────────────────
  if (isMultiRoom) {
    const roomTypeIds = roomSelections.map((r) => r.roomTypeId)

    const { data: roomTypes, error: rtError } = await db
      .from('room_types')
      .select(
        `
        id, name, description, base_price, max_adults, max_children,
        max_occupancy, standard_occupancy, extra_bed_price, num_available_rooms, bed_configuration
      `
      )
      .in('id', roomTypeIds)
      .eq('hotel_id', hotel.id)

    if (rtError || !roomTypes || roomTypes.length === 0) {
      redirect({ href: `/hotels/${slug}`, locale: 'en' })
      return
    }

    // Overwrite the raw inventory count with real availability (bookings + blocks
    // subtracted) so the picker never offers more rooms than can actually be booked.
    let availableRoomTypes = roomTypes
    if (checkIn && checkOut) {
      const availableMap = await HotelService.getAvailableRoomsMap(adminDb, roomTypes, checkIn, checkOut)
      availableRoomTypes = roomTypes.map((rt) => ({
        ...rt,
        num_available_rooms: availableMap.get(rt.id) ?? rt.num_available_rooms,
      }))
    }

    // Build selections array, preserving requested quantities
    const rtMap = new Map(availableRoomTypes.map((rt) => [rt.id, rt]))
    const selections = roomSelections
      .map((sel) => {
        const room = rtMap.get(sel.roomTypeId)
        if (!room) return null
        return { room, qty: Math.min(sel.numRooms, Math.max(room.num_available_rooms ?? 0, 0)) }
      })
      .filter((s) => s && s.qty > 0) as Array<{ room: (typeof availableRoomTypes)[0]; qty: number }>

    if (selections.length === 0) {
      redirect({ href: `/hotels/${slug}`, locale: 'en' })
      return
    }

    const priceRules = await fetchPriceRules(db, roomTypeIds)

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar transparent={false} />
        <main className="grow page-container py-8 pt-24">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Review your booking</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your stay, add guest details and pay securely.
            </p>
          </div>

          <MultiRoomBookingForm
            hotel={hotelSummary}
            selections={selections}
            priceRules={priceRules}
            mealPlans={mealPlans || []}
            userId={user?.id}
            userEmail={user?.email}
            userName={userName}
            userPhone={user?.user_metadata?.phone}
            initialCheckIn={initialCheckIn}
            initialCheckOut={initialCheckOut}
            initialAdults={initialAdults}
            initialChildren={initialChildren}
            initialPets={initialPets}
          />
        </main>
      </div>
    )
  }

  // ── Single-room path (backwards-compat) ─────────────────────────────────────
  const { data: room, error: roomError } = await db
    .from('room_types')
    .select(
      `
      id, name, description, base_price, max_adults, max_children,
      max_occupancy, standard_occupancy, extra_bed_price, num_available_rooms, bed_configuration,
      room_type_images(image_url, alt_text)
    `
    )
    .eq('id', roomId!)
    .eq('hotel_id', hotel.id)
    .single()

  if (roomError || !room) {
    redirect({ href: `/hotels/${slug}`, locale: 'en' })
    return
  }

  let availableRoom = room
  if (checkIn && checkOut) {
    const availableMap = await HotelService.getAvailableRoomsMap(adminDb, [room], checkIn, checkOut)
    availableRoom = { ...room, num_available_rooms: availableMap.get(room.id) ?? room.num_available_rooms }

    if ((availableRoom.num_available_rooms ?? 0) <= 0) {
      redirect({ href: `/hotels/${slug}`, locale: 'en' })
      return
    }
  }

  const priceRules = await fetchPriceRules(db, [room.id])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />
      <main className="grow page-container py-8 pt-24">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Review your booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your stay, add guest details and pay securely.
          </p>
        </div>

        <BookingForm
          hotel={hotelSummary}
          room={availableRoom}
          priceRules={priceRules}
          mealPlans={mealPlans || []}
          userId={user?.id}
          userEmail={user?.email}
          userName={userName}
          userPhone={user?.user_metadata?.phone}
          initialCheckIn={initialCheckIn}
          initialCheckOut={initialCheckOut}
          initialAdults={initialAdults}
          initialChildren={initialChildren}
          initialPets={initialPets}
        />
      </main>
    </div>
  )
}
