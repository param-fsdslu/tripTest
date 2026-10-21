import { createClient } from '@/lib/db/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefundsTable } from '@/components/admin/RefundsTable'
import { DollarSign, TrendingDown, Clock, CheckCircle } from 'lucide-react'

export default async function AdminRefundsPage() {
  const db = await createClient()

  // Get refund statistics — join both hotel and boat bookings
  const { data: refunds } = await db
    .from('refund_transactions')
    .select(`
      *,
      booking:bookings!booking_id(booking_reference, total_amount, check_in_date),
      boat_booking:boat_bookings!boat_booking_id(booking_reference, total_amount, trip_date),
      payment:payments(payment_gateway_payment_id, amount)
    `)
    .order('created_at', { ascending: false })

  const totalRefunds = refunds?.length || 0
  const totalRefundAmount = refunds?.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0
  const pendingRefunds = refunds?.filter(r => r.status === 'pending_approval').length || 0
  const completedRefunds = refunds?.filter(r => r.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Refund Management</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage all refund requests and cancellations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRefunds}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.round(totalRefundAmount).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Refunded to customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRefunds}</div>
            <p className="text-xs text-muted-foreground">Awaiting admin review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRefunds}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Transactions</CardTitle>
          <CardDescription>
            View and manage all refund requests with 48-hour cancellation policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RefundsTable refunds={refunds || []} />
        </CardContent>
      </Card>
    </div>
  )
}
