'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Hotel,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  DollarSign,
  Users,
  Shield,
  FileText,
  Menu,
  X,
  Ship,
  Anchor,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminRole } from '@/lib/utils/roles'
import { useState } from 'react'
import { isFeatureEnabled, type FeatureName } from '@/lib/config/features'

interface AdminNavProps {
  email?: string
  role: AdminRole
  roleDisplayName: string
  hotelIds: string[] | null
}

export function AdminNav({ email, role, roleDisplayName, hotelIds }: AdminNavProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Define navigation items with role-based access
  const allNavigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
    },
    {
      name: 'Bookings',
      href: '/admin/bookings',
      icon: Calendar,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
      feature: 'hotels' as FeatureName,
    },
    {
      name: 'Hotels',
      href: '/admin/hotels',
      icon: Hotel,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
      feature: 'hotels' as FeatureName,
    },
    {
      name: 'Boats',
      href: '/admin/boats',
      icon: Ship,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
      feature: 'boats' as FeatureName,
    },
    {
      name: 'Boat Bookings',
      href: '/admin/boat-bookings',
      icon: Anchor,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
      feature: 'boats' as FeatureName,
    },
    {
      name: 'Payments',
      href: '/admin/payments',
      icon: CreditCard,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
    },
    {
      name: 'Refunds',
      href: '/admin/refunds',
      icon: DollarSign,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      roles: ['super_admin'] as AdminRole[], // Only super admins see global analytics
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      roles: ['super_admin'] as AdminRole[], // Only super admins manage users
    },
    {
      name: 'Reviews',
      href: '/admin/reviews',
      icon: Star,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
    },
    {
      name: 'Blog',
      href: '/admin/blogs',
      icon: FileText,
      roles: ['super_admin'] as AdminRole[], // Only super admins manage blog
      feature: 'blogs' as FeatureName,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      roles: ['super_admin', 'hotel_admin'] as AdminRole[],
    },
  ]

  // Filter navigation based on user role
  const navigation = allNavigation.filter(
    (item) => item.roles.includes(role) && (!item.feature || isFeatureEnabled(item.feature))
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-secondary text-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex h-screen flex-col bg-secondary text-white w-64 fixed lg:sticky top-0 z-40 transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-gold" />
                <p className="text-sm font-medium text-white truncate">{roleDisplayName}</p>
              </div>
              <p className="text-xs text-white/70 truncate">{email}</p>
              {role === 'hotel_admin' && hotelIds && hotelIds.length > 0 && (
                <p className="text-xs text-white/50 mt-1">
                  Managing {hotelIds.length} {hotelIds.length === 1 ? 'hotel' : 'hotels'}
                </p>
              )}
            </div>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
