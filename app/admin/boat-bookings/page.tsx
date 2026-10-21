import { getAllBoatBookings } from '@/lib/actions/boat-admin'
import { BoatBookingsTable } from '@/components/admin/BoatBookingsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminBoatBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const status = typeof params.status === 'string' ? params.status : undefined
  const paymentStatus = typeof params.paymentStatus === 'string' ? params.paymentStatus : undefined

  const result = await getAllBoatBookings({ status, paymentStatus, page, limit: 20 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Boat Bookings</h1>
        <p className="text-muted-foreground mt-2">Manage all boat trip bookings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Boat Bookings</CardTitle>
          <CardDescription>
            {result.success ? `${result.pagination?.total || 0} total bookings` : 'Failed to load bookings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <BoatBookingsTable bookings={result.bookings} pagination={result.pagination} />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
