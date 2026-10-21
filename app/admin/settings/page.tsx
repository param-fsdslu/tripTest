import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getHotelAdminPermissions } from '@/lib/actions/admin/permissions'
import { HotelAdminPermissionsManager } from '@/components/admin/HotelAdminPermissionsManager'

export default async function AdminSettingsPage() {
  const isSuperAdmin = await checkIsSuperAdmin()
  const permissionsResult = isSuperAdmin ? await getHotelAdminPermissions() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">Configure platform settings and permissions</p>
      </div>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Hotel Admin Permissions</CardTitle>
            </div>
            <CardDescription>
              Control which actions hotel admins are allowed to perform. Super admins are never
              restricted by these settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissionsResult?.success && permissionsResult.permissions ? (
              <HotelAdminPermissionsManager initialPermissions={permissionsResult.permissions} />
            ) : (
              <p className="text-sm text-destructive">
                {permissionsResult?.error || 'Failed to load permissions'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm">
              Settings are only accessible to super admins.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
