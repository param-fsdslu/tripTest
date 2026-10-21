'use server'

import { createClient, createAdminClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phone?: string
  profileImage?: string
}

export async function updateProfile(data: UpdateProfileData) {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('You must be logged in')
    }

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ')

    // Update profiles table (full_name is a generated column — do not set it directly)
    const updates: Record<string, any> = {
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      phone: data.phone || null,
      updated_at: new Date().toISOString(),
    }

    if (data.profileImage !== undefined) {
      updates.profile_image = data.profileImage || null
    }

    const { error: profileError } = await db
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      throw new Error('Failed to update profile')
    }

    // Keep auth metadata in sync
    await db.auth.updateUser({
      data: {
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        full_name: fullName || null,
      },
    })

    revalidatePath('/profile')

    return { success: true }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}

export async function deleteAccount() {
  try {
    const db = await createClient()

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('You must be logged in')
    }

    const serviceClient = createAdminClient()
    const userId = user.id

    // 1. Delete wishlists (no value after account deletion)
    await serviceClient.from('wishlists').delete().eq('user_id', userId)

    // 2. Anonymize reviews — keep content but remove user association
    await serviceClient
      .from('reviews')
      .update({ user_id: null })
      .eq('user_id', userId)

    await serviceClient
      .from('boat_reviews')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 3. Anonymize bookings — keep transaction records for accounting
    await serviceClient
      .from('bookings')
      .update({ user_id: null })
      .eq('user_id', userId)

    await serviceClient
      .from('boat_bookings')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 4. Sign out
    await db.auth.signOut()

    // 5. Delete auth user (profiles row deleted via ON DELETE CASCADE)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Delete account error:', deleteError)
      throw new Error('Failed to delete account')
    }

    revalidatePath('/', 'layout')
  } catch (error: any) {
    console.error('Delete account error:', error)
    return { success: false, error: error.message || 'Failed to delete account' }
  }

  redirect('/')
}
