/**
 * Hotel data access service — search, retrieval, and availability queries.
 *
 * All methods are static and return null / empty arrays on error rather than
 * throwing, to prevent page-level crashes when hotel data is unavailable.
 * avg_rating and starting_price are computed fields derived from joined tables.
 */
import { createClient } from '@/lib/db/server';
import type {
  Hotel,
  HotelWithDetails,
  HotelSearchParams,
  RoomType,
  RoomTypeWithDetails,
  DateRange,
  PaginatedResponse,
  PriceRule,
  DestinationIndex,
  DestinationPlace,
} from '@/lib/types';
import { calculateRoomStayPricing } from '@/lib/utils';
import { hotelDistrict, loadIndiaLocations } from '@/lib/utils/india-locations';

export class HotelService {
  /**
   * Computes true available-room counts for a set of room types over a date range:
   *   num_available_rooms - confirmed/pending bookings overlapping the range
   *                        - manual inventory blocks overlapping the range
   *
   * This is the single source of truth for availability and must be used by every
   * surface that displays or validates room counts (search results, hotel detail
   * page, booking page, checkout) — not just the final booking-creation check —
   * so the count shown to a guest never overstates what they can actually book.
   */
  static async getAvailableRoomsMap(
    db: Awaited<ReturnType<typeof createClient>>,
    rooms: { id: string; num_available_rooms: number | null }[],
    checkInDate: string,
    checkOutDate: string
  ): Promise<Map<string, number>> {
    const roomTypeIds = rooms.map((r) => r.id);
    const result = new Map<string, number>();
    if (roomTypeIds.length === 0) return result;

    const { data: bookings } = await db
      .from('bookings')
      .select('room_type_id, num_rooms')
      .in('room_type_id', roomTypeIds)
      .in('booking_status', ['confirmed', 'pending'])
      .in('payment_status', ['paid', 'pending', 'processing'])
      .lt('check_in_date', checkOutDate)
      .gt('check_out_date', checkInDate);

    const { data: blocks } = await db
      .from('room_inventory_blocks')
      .select('room_type_id, rooms_blocked')
      .in('room_type_id', roomTypeIds)
      .lte('start_date', checkOutDate)
      .gte('end_date', checkInDate);

    const bookedByRoom = new Map<string, number>();
    for (const b of bookings || []) {
      bookedByRoom.set(b.room_type_id, (bookedByRoom.get(b.room_type_id) || 0) + (b.num_rooms || 1));
    }
    const blockedByRoom = new Map<string, number>();
    for (const b of blocks || []) {
      blockedByRoom.set(b.room_type_id, (blockedByRoom.get(b.room_type_id) || 0) + (b.rooms_blocked || 0));
    }

    for (const room of rooms) {
      const booked = bookedByRoom.get(room.id) || 0;
      const blocked = blockedByRoom.get(room.id) || 0;
      result.set(room.id, Math.max(0, (room.num_available_rooms || 0) - booked - blocked));
    }
    return result;
  }

  /**
   * Computes the average effective per-night price (weekend/festival/custom
   * pricing applied) for a stay, per room type. Used to set current_price so
   * guest-facing pages show accurate pricing before checkout, not just base_price.
   */
  static async getEffectivePriceMap(
    db: Awaited<ReturnType<typeof createClient>>,
    rooms: { id: string; base_price: number }[],
    checkInDate: string,
    checkOutDate: string
  ): Promise<Map<string, number>> {
    const roomTypeIds = rooms.map((r) => r.id);
    const result = new Map<string, number>();
    if (roomTypeIds.length === 0 || checkInDate >= checkOutDate) return result;

    const { data: rules } = await db
      .from('price_rules')
      .select('*')
      .in('room_type_id', roomTypeIds)
      .eq('is_active', true)
      .lte('valid_from', checkOutDate)
      .gte('valid_to', checkInDate);

    const priceRules = (rules || []) as PriceRule[];
    for (const room of rooms) {
      const { nights } = calculateRoomStayPricing(room, checkInDate, checkOutDate, 1, priceRules);
      if (nights.length === 0) continue;
      const average = nights.reduce((sum, n) => sum + n.price, 0) / nights.length;
      result.set(room.id, Math.round(average * 100) / 100);
    }
    return result;
  }

  /**
   * Searches active hotels with optional city, star rating, property type, and price filters.
   * Price filtering is applied via an embedded filter on room_types.base_price.
   * Returns a paginated result with starting_price computed as the min room price.
   */
  static async searchHotels(
    params: HotelSearchParams
  ): Promise<PaginatedResponse<HotelWithDetails>> {
    const db = await createClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let query = db
      .from('hotels')
      .select(
        `
        id,
        name,
        slug,
        description,
        star_rating,
        property_type,
        city,
        state,
        country,
        address_line_1,
        location_rating,
        status,
        created_at,
        hotel_images!inner(image_url, alt_text, is_primary, display_order),
        room_types!inner(id, name, base_price, max_occupancy, status)
      `,
        { count: 'exact' }
      )
      .eq('status', 'active');

    // Filter by city/location
    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }

    // Filter by star rating
    if (params.starRating && params.starRating.length > 0) {
      query = query.in('star_rating', params.starRating);
    }

    // Filter by property type
    if (params.propertyType && params.propertyType.length > 0) {
      query = query.eq('property_type', params.propertyType);
    }

    // Filter by price range (using room_types)
    if (params.priceMin !== undefined) {
      query = query.gte('room_types.base_price', params.priceMin);
    }
    if (params.priceMax !== undefined) {
      query = query.lte('room_types.base_price', params.priceMax);
    }

    // Apply sorting
    switch (params.sortBy) {
      case 'price_low':
        query = query.order('room_types.base_price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('room_types.base_price', { ascending: false });
        break;
      case 'rating':
        query = query.order('location_rating', { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching hotels:', error);
      // Return empty result instead of throwing
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Transform data and calculate aggregations
    const hotels: HotelWithDetails[] = (data || []).map((hotel: any) => ({
      ...hotel,
      hotel_images: hotel.hotel_images || [],
      room_types: hotel.room_types || [],
      hotel_amenities: [],
      reviews: [],
      nearby_attractions: [],
      starting_price: hotel.room_types?.length
        ? Math.min(...hotel.room_types.map((rt: any) => rt.base_price))
        : undefined,
    }));

    return {
      data: hotels,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Fetches a hotel by ID with full relations: images, room types (with images and amenities),
   * hotel amenities (with categories), reviews (with admin responses), and nearby attractions.
   * Computes avg_rating (rounded to 1dp) and review_count from joined reviews.
   */
  static async getHotelById(id: string): Promise<HotelWithDetails | null> {
    const db = await createClient();

    const { data, error } = await db
      .from('hotels')
      .select(
        `
        *,
        hotel_images(id, image_url, alt_text, is_primary, display_order),
        hotel_panoramas(id, image_url, title, display_order),
        room_types(
          *,
          room_type_images(id, image_url, alt_text, display_order),
          room_type_amenities(
            id,
            amenity:amenities(id, name, icon)
          )
        ),
        hotel_amenities(
          id,
          is_free,
          additional_charge,
          amenity:amenities(id, name, icon, category:amenity_categories(id, name))
        ),
        reviews!inner(
          *,
          review_response:review_responses(id, response_text, created_at)
        ),
        hotel_nearby_attractions(
          distance_meters,
          distance_text,
          attraction:nearby_attractions(id, name, category, description)
        )
      `
      )
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error getting hotel by ID:', error);
      if (error.code === 'PGRST116') return null; // Not found
      // Return null instead of throwing to prevent crashes
      return null;
    }

    // Calculate average rating (approved reviews only, convert 0-10 DB scale to 0-5 display scale)
    const approvedReviews = (data.reviews || []).filter((r: any) => r.status === 'approved');
    const avgRating =
      approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) /
          approvedReviews.length /
          2
        : undefined;

    return {
      ...data,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
      review_count: approvedReviews.length,
      starting_price: data.room_types?.length
        ? Math.min(...data.room_types.map((rt: any) => rt.base_price))
        : undefined,
    };
  }

  /**
   * Same as getHotelById but looked up by URL slug.
   * Used by the hotel detail page and TanStack Query's useHotelBySlug hook.
   * When checkIn/checkOut are provided, each room type's num_available_rooms is
   * overwritten with the real available count (bookings + blocks subtracted) so
   * the detail page never overstates availability ahead of checkout.
   */
  static async getHotelBySlug(
    slug: string,
    checkIn?: string,
    checkOut?: string
  ): Promise<HotelWithDetails | null> {
    const db = await createClient();

    const { data, error } = await db
      .from('hotels')
      .select(
        `
        *,
        hotel_images(id, image_url, alt_text, is_primary, display_order),
        hotel_panoramas(id, image_url, title, display_order),
        room_types(
          *,
          room_type_images(id, image_url, alt_text, display_order),
          room_type_amenities(
            id,
            amenity:amenities(id, name, icon)
          )
        ),
        hotel_amenities(
          id,
          is_free,
          additional_charge,
          amenity:amenities(id, name, icon, category:amenity_categories(id, name))
        ),
        reviews(
          *,
          review_response:review_responses(id, response_text, created_at)
        ),
        hotel_nearby_attractions(
          distance_meters,
          distance_text,
          attraction:nearby_attractions(id, name, category, description)
        )
      `
      )
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error getting hotel by slug:', error);
      if (error.code === 'PGRST116') return null;
      // Return null instead of throwing to prevent crashes
      return null;
    }

    const approvedReviews = (data.reviews || []).filter((r: any) => r.status === 'approved');
    const avgRating =
      approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) /
          approvedReviews.length /
          2
        : undefined;

    if (checkIn && checkOut && data.room_types?.length) {
      const [availableMap, priceMap] = await Promise.all([
        this.getAvailableRoomsMap(db, data.room_types, checkIn, checkOut),
        this.getEffectivePriceMap(db, data.room_types, checkIn, checkOut),
      ]);
      data.room_types = data.room_types.map((rt: any) => ({
        ...rt,
        num_available_rooms: availableMap.get(rt.id) ?? rt.num_available_rooms,
        current_price: priceMap.get(rt.id) ?? rt.base_price,
      }));
    }

    return {
      ...data,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
      review_count: approvedReviews.length,
      starting_price: data.room_types?.length
        ? Math.min(...data.room_types.map((rt: any) => rt.current_price ?? rt.base_price))
        : undefined,
    };
  }

  /**
   * Returns available room types for a hotel, sorted by price ascending.
   * Date-based availability filtering is not yet implemented (TODO in source).
   */
  static async getRoomTypes(
    hotelId: string,
    filters?: { checkIn?: string; checkOut?: string }
  ): Promise<RoomTypeWithDetails[]> {
    const db = await createClient();

    const { data, error } = await db
      .from('room_types')
      .select(
        `
        *,
        room_type_images(id, image_url, alt_text, display_order),
        room_type_amenities(
          id,
          amenity:amenities(id, name, icon)
        )
      `
      )
      .eq('hotel_id', hotelId)
      .eq('status', 'available')
      .order('base_price', { ascending: true });

    if (error) {
      console.error('Error getting room types:', error);
      // Return empty array instead of throwing
      return [];
    }

    // TODO: Check availability if dates provided
    // For now, return all room types
    return data || [];
  }

  /**
   * Returns available room count for a room type on the given date range.
   * Subtracts the maximum daily manual block from num_available_rooms.
   * (Full booking-overlap checking is a future enhancement.)
   */
  static async checkAvailability(
    roomTypeId: string,
    dateRange: DateRange
  ): Promise<{ available: boolean; available_rooms: number }> {
    const db = await createClient();

    // Get total rooms for this room type
    const { data: roomType, error: rtError } = await db
      .from('room_types')
      .select('num_available_rooms')
      .eq('id', roomTypeId)
      .single();

    if (rtError) {
      console.error('Error checking availability:', rtError);
      return { available: false, available_rooms: 0 };
    }

    let totalRooms = roomType?.num_available_rooms || 0;

    // Subtract manual inventory blocks that overlap the requested date range
    if (dateRange.from && dateRange.to) {
      const checkIn = dateRange.from instanceof Date
        ? dateRange.from.toISOString().slice(0, 10)
        : String(dateRange.from);
      const checkOut = dateRange.to instanceof Date
        ? dateRange.to.toISOString().slice(0, 10)
        : String(dateRange.to);

      const { data: blocks } = await db
        .from('room_inventory_blocks')
        .select('rooms_blocked')
        .eq('room_type_id', roomTypeId)
        .lte('start_date', checkOut)
        .gte('end_date', checkIn);

      if (blocks && blocks.length > 0) {
        const totalBlocked = blocks.reduce(
          (sum: number, b: { rooms_blocked: number }) => sum + b.rooms_blocked,
          0
        );
        totalRooms = Math.max(0, totalRooms - totalBlocked);
      }
    }

    return {
      available: totalRooms > 0,
      available_rooms: totalRooms,
    };
  }

  /**
   * What the destination search suggests: every city with active stays (with how many), most
   * stays first, and the stays themselves. A city's region is "District, State"; hotels saved
   * without a district get the one their city belongs to.
   */
  static async getDestinationIndex(): Promise<DestinationIndex> {
    const db = await createClient();

    const { data, error } = await db
      .from('hotels')
      .select('name, slug, city, district, state')
      .eq('status', 'active');

    if (error) {
      console.error('Error getting destinations:', error);
      return { places: [], stays: [] };
    }

    const states = await loadIndiaLocations();
    const places = new Map<string, DestinationPlace>();
    const count = (kind: DestinationPlace['kind'], name: string | null, region: string) => {
      if (!name) return;
      const key = `${kind}:${name.toLowerCase()}`;
      const place = places.get(key);
      if (place) place.stays += 1;
      else places.set(key, { kind, name, region, stays: 1 });
    };

    const stays = (data || []).map((hotel: any) => {
      count('city', hotel.city, [hotelDistrict(states, hotel), hotel.state].filter(Boolean).join(', '));
      return { name: hotel.name, slug: hotel.slug, region: [hotel.city, hotel.state].filter(Boolean).join(', ') };
    });

    return {
      places: [...places.values()].sort((a, b) => b.stays - a.stays || a.name.localeCompare(b.name)),
      stays: stays.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Returns the top N active hotels ordered by location_rating descending.
   * Used on the homepage featured section (cached for 10 minutes via useFeaturedHotels hook).
   */
  static async getFeaturedHotels(limit: number = 10): Promise<HotelWithDetails[]> {
    const db = await createClient();

    const { data, error } = await db
      .from('hotels')
      .select(
        `
        id,
        name,
        slug,
        description,
        star_rating,
        property_type,
        city,
        state,
        country,
        location_rating,
        status,
        created_at,
        hotel_images(image_url, alt_text, is_primary, display_order),
        room_types(id, name, base_price),
        reviews(overall_rating)
      `
      )
      .eq('status', 'active')
      .order('location_rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured hotels:', error);
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }

    return (data || []).map((hotel: any) => ({
      ...hotel,
      hotel_amenities: [],
      nearby_attractions: [],
      avg_rating: hotel.reviews?.length
        ? hotel.reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) /
          hotel.reviews.length /
          2
        : undefined,
      review_count: hotel.reviews?.length || 0,
      starting_price: hotel.room_types?.length
        ? Math.min(...hotel.room_types.map((rt: any) => rt.base_price))
        : undefined,
    }));
  }
}
