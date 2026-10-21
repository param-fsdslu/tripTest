import { getAdminStats, getRecentActivity } from '@/lib/actions/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Hotel,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'

export default async function AdminDashboard() {
  const statsResult = await getAdminStats()
  const activityResult = await getRecentActivity(10)

  const stats = statsResult.success ? statsResult.stats : null
  const activities = activityResult.success ? activityResult.activities : []

  if (!stats) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-red-600 mt-4">Failed to load statistics</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Hotels',
      value: stats.totalHotels,
      icon: Hotel,
      description: 'Active hotels in the system',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      description: 'All time bookings',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Revenue',
      value: `₹${Math.round(stats.totalRevenue).toLocaleString('en-IN')}`,
      icon: DollarSign,
      description: 'From paid bookings',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Bookings Today',
      value: stats.bookingsToday,
      icon: TrendingUp,
      description: 'New bookings today',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: 'Pending Bookings',
      value: stats.pendingBookings,
      icon: Clock,
      description: 'Awaiting confirmation',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Confirmed Bookings',
      value: stats.confirmedBookings,
      icon: CheckCircle2,
      description: 'Active reservations',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      completed: 'default',
    }
    return variants[status] || 'secondary'
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'secondary',
    }
    return variants[status] || 'secondary'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Overview of your hotel booking platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest booking activity</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {activities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/60 transition-colors gap-3 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground text-sm sm:text-base">
                        {activity.guest_first_name} {activity.guest_last_name}
                      </h4>
                      <Badge variant={getStatusBadge(activity.booking_status)} className="text-xs">
                        {activity.booking_status}
                      </Badge>
                      <Badge variant={getPaymentStatusBadge(activity.payment_status)} className="text-xs">
                        {activity.payment_status}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {activity.hotel?.name} • Ref: {activity.booking_reference}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-bold text-foreground text-base sm:text-lg">
                      ₹{Math.round(activity.total_amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
