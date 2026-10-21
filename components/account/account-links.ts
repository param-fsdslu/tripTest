import { CalendarCheck, Heart, UserCircle, type LucideIcon } from 'lucide-react'

export interface AccountLink {
  href: string
  label: string
  icon: LucideIcon
}

/** Account pages in menu order. The account sidebar, its phone tabs and the navbar account menu all use this. */
export const ACCOUNT_LINKS: AccountLink[] = [
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/bookings', label: 'My Bookings', icon: CalendarCheck },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
]
