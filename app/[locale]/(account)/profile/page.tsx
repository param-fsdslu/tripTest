import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection'

export default async function ProfilePage() {
  const db = await createClient()

  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await db
    .from('profiles')
    .select('first_name, last_name, phone, profile_image')
    .eq('id', user.id)
    .single()

  return (
    <div>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-px w-6 bg-gold" />
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            My Account
          </span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal information
        </p>
      </div>

      <div className="space-y-4">
        <ProfileEditForm
          email={user.email || ''}
          profile={profile}
        />
        <DeleteAccountSection />
      </div>
    </div>
  )
}
