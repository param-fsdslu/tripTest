import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReviewsTable } from '@/components/admin/ReviewsTable'
import { getAdminHotelReviews, getAdminBoatReviews } from '@/lib/actions/admin-reviews'
import { Star, Clock, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminReviewsPage() {
  const [hotelResult, boatResult] = await Promise.all([
    getAdminHotelReviews(),
    getAdminBoatReviews(),
  ])

  const hotelReviews = hotelResult.reviews ?? []
  const boatReviews  = boatResult.reviews  ?? []
  const allReviews   = [...hotelReviews, ...boatReviews]

  const totalPending  = allReviews.filter((r) => r.status === 'pending').length
  const totalApproved = allReviews.filter((r) => r.status === 'approved').length
  const totalRejected = allReviews.filter((r) => r.status === 'rejected').length
  const totalAll      = allReviews.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject guest reviews before they appear publicly on hotel and boat pages
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAll}</div>
            <p className="text-xs text-muted-foreground">Hotel + Boat combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting moderation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
            <p className="text-xs text-muted-foreground">Visible to guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalRejected}</div>
            <p className="text-xs text-muted-foreground">Hidden from guests</p>
          </CardContent>
        </Card>
      </div>

      {(!hotelResult.success || !boatResult.success) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">
            {!hotelResult.success && <p>Failed to load hotel reviews: {hotelResult.error}</p>}
            {!boatResult.success && <p>Failed to load boat reviews: {boatResult.error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Reviews</CardTitle>
          <CardDescription>
            Reviews are hidden until approved. Pending reviews are shown with a badge count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewsTable hotelReviews={hotelReviews} boatReviews={boatReviews} />
        </CardContent>
      </Card>
    </div>
  )
}
