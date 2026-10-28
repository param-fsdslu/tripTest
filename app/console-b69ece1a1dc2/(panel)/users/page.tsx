import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getAllAdminUsers } from '@/lib/actions/users'
import { UsersTable } from '@/components/admin/UsersTable'
import { CreateUserDialog } from '@/components/admin/CreateUserDialog'
import { Users as UsersIcon } from 'lucide-react'
import { ADMIN_PATH } from '@/lib/config/admin-path'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export const metadata = {
  title: 'User Management - Admin Dashboard',
  description: 'Manage admin users and their roles',
}

export default async function UsersPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect(ADMIN_PATH)
  }

  // Get all admin users
  const { users, error } = await getAllAdminUsers()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        icon={UsersIcon}
        description="Manage admin users and assign hotel access"
        actions={<CreateUserDialog />}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading users</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <UsersTable users={users} />
    </div>
  )
}
