import { getAllBookings, getAdminHotelsList } from '@/lib/actions/admin'
import { BookingsTable } from '@/components/admin/BookingsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const status = typeof params.status === 'string' ? params.status : undefined
  const paymentStatus = typeof params.paymentStatus === 'string' ? params.paymentStatus : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : undefined
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : undefined
  const hotelId = typeof params.hotelId === 'string' ? params.hotelId : undefined

  const [result, hotels] = await Promise.all([
    getAllBookings({
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      hotelId,
      page,
      limit: 20,
    }),
    getAdminHotelsList(),
  ])

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Bookings Management" description="Manage all hotel bookings" />

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            {result.success
              ? `${result.pagination?.total || 0} total bookings`
              : 'Failed to load bookings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <BookingsTable
              bookings={result.bookings}
              pagination={result.pagination}
              hotels={hotels}
            />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
