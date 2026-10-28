'use server'

import { createClient } from '@/lib/db/server'
import { requireAdmin, getAdminHotelAccess } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import { requireHotelAdminPermission, verifyHotelAccess } from './_helpers'
import { ADMIN_PATH } from '@/lib/config/admin-path'

/**
 * Get all hotels with pagination
 * Filtered by role: super_admin sees all, hotel_admin sees only their hotels
 */
export async function getAllHotels(filters?: {
  city?: string
  status?: string
  page?: number
  limit?: number
}) {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .from('hotels')
      .select('*', { count: 'exact' })

    // Filter by hotel access
    if (adminAccess.hotelIds !== null) {
      query = query.in('id', adminAccess.hotelIds)
    }

    // Apply filters
    if (filters?.city) {
      query = query.eq('city', filters.city)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      // Hide archived (soft-deleted) hotels from the default admin list
      query = query.neq('status', 'archived')
    }

    const { data: hotels, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      hotels: hotels || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }
  } catch (error: any) {
    console.error('Error fetching hotels:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch hotels',
      hotels: [],
    }
  }
}

/**
 * Get hotel by ID (admin only)
 */
export async function getHotelById(hotelId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: hotel, error } = await db
      .from('hotels')
      .select(
        `
        *,
        hotel_images(
          id,
          image_url,
          alt_text,
          display_order
        ),
        hotel_panoramas(id, image_url, title, display_order),
        hotel_amenities(
          id,
          amenity:amenities(
            id,
            name,
            category_id,
            icon,
            category:amenity_categories(
              id,
              name
            )
          )
        )
      `
      )
      .eq('id', hotelId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      hotel,
    }
  } catch (error: any) {
    console.error('Error fetching hotel:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch hotel',
    }
  }
}

/**
 * Create new hotel (admin only)
 */
export async function createHotel(hotelData: any) {
  try {
    await requireAdmin()
    const db = await createClient()
    const adminAccess = await getAdminHotelAccess()

    if (!adminAccess) {
      throw new Error('Unauthorized')
    }

    // If hotel_admin, automatically set owner_id to their user ID
    const dataToInsert = {
      ...hotelData,
      owner_id: adminAccess.role === 'hotel_admin' ? adminAccess.userId : hotelData.owner_id,
    }

    const { data: hotel, error } = await db
      .from('hotels')
      .insert(dataToInsert)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // If hotel_admin, also update their hotel_ids in user metadata
    if (adminAccess.role === 'hotel_admin') {
      const currentHotelIds = adminAccess.hotelIds || []
      if (!currentHotelIds.includes(hotel.id)) {
        // Update user metadata to include the new hotel
        const { data: { user } } = await db.auth.getUser()
        if (user) {
          await db.auth.updateUser({
            data: {
              hotel_ids: [...currentHotelIds, hotel.id],
            },
          })
        }
      }
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      hotel,
    }
  } catch (error: any) {
    console.error('Error creating hotel:', error)
    return {
      success: false,
      error: error.message || 'Failed to create hotel',
    }
  }
}

/**
 * Update hotel (admin only)
 * Requires: property_details permission (hotel admins)
 * Cancellation policy edits are gated under cancellation_policy permission separately.
 */
export async function updateHotel(hotelId: string, hotelData: any) {
  try {
    await requireAdmin()
    await verifyHotelAccess(hotelId)
    // Gate: different fields map to different permissions
    if ('cancellation_policy_text' in hotelData) {
      await requireHotelAdminPermission('cancellation_policy')
    } else {
      await requireHotelAdminPermission('property_details')
    }
    const db = await createClient()

    const { data: hotel, error } = await db
      .from('hotels')
      .update(hotelData)
      .eq('id', hotelId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')
    revalidatePath(`/hotels/${hotel.slug}`)

    return {
      success: true,
      hotel,
    }
  } catch (error: any) {
    console.error('Error updating hotel:', error)
    return {
      success: false,
      error: error.message || 'Failed to update hotel',
    }
  }
}

/**
 * Delete hotel (admin only)
 */
export async function deleteHotel(hotelId: string) {
  try {
    await requireAdmin()
    const db = await createClient()

    // Check if hotel has any upcoming/active bookings.
    // Past, completed, cancelled, and no-show bookings should not block deletion.
    const today = new Date().toISOString().split('T')[0]
    const { count: activeBookingsCount } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .in('booking_status', ['pending', 'confirmed'])
      .gte('check_out_date', today)

    if (activeBookingsCount && activeBookingsCount > 0) {
      return {
        success: false,
        error: 'Cannot delete hotel with upcoming or active bookings. Set status to inactive instead.',
      }
    }

    // If the hotel has any historical bookings (past/completed/cancelled/no-show),
    // hard-deleting would cascade-delete that booking/payment/review history.
    // Archive it instead: it disappears from the public site and the admin's
    // default hotel list, but the historical records are preserved.
    const { count: historicalBookingsCount } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)

    if (historicalBookingsCount && historicalBookingsCount > 0) {
      const { error: archiveError } = await db
        .from('hotels')
        .update({ status: 'archived' })
        .eq('id', hotelId)

      if (archiveError) {
        throw new Error(archiveError.message)
      }

      revalidatePath(`${ADMIN_PATH}/hotels`)
      revalidatePath('/hotels')

      return {
        success: true,
        archived: true,
      }
    }

    const { error } = await db
      .from('hotels')
      .delete()
      .eq('id', hotelId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      archived: false,
    }
  } catch (error: any) {
    console.error('Error deleting hotel:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete hotel',
    }
  }
}

/**
 * Update hotel status (admin only)
 */
export async function updateHotelStatus(
  hotelId: string,
  status: 'active' | 'inactive' | 'pending' | 'archived'
) {
  try {
    await requireAdmin()
    const db = await createClient()

    const { data: hotel, error } = await db
      .from('hotels')
      .update({ status })
      .eq('id', hotelId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`${ADMIN_PATH}/hotels`)
    revalidatePath('/hotels')

    return {
      success: true,
      hotel,
    }
  } catch (error: any) {
    console.error('Error updating hotel status:', error)
    return {
      success: false,
      error: error.message || 'Failed to update hotel status',
    }
  }
}
