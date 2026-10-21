import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getAllAdminUsers } from '@/lib/actions/users'
import { UsersTable } from '@/components/admin/UsersTable'
import { CreateUserDialog } from '@/components/admin/CreateUserDialog'
import { Users as UsersIcon } from 'lucide-react'

export const metadata = {
  title: 'User Management - Admin Dashboard',
  description: 'Manage admin users and their roles',
}

export default async function UsersPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect('/admin')
  }

  // Get all admin users
  const { users, error } = await getAllAdminUsers()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage admin users and assign hotel access
          </p>
        </div>
        <CreateUserDialog />
      </div>

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
