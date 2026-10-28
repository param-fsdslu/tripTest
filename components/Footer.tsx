import Image from 'next/image'
import { Mail, MapPin, Phone } from 'lucide-react'
import { isFeatureEnabled } from '@/lib/config/features'
import { ListPropertyButton } from '@/components/listing/ListPropertyButton'
import { PackageEnquiryButton } from '@/components/packages/PackageEnquiryButton'

const serviceLinks = [
  { href: '/hotels', label: 'Hotels & homestays', show: isFeatureEnabled('hotels') },
  { href: '/boats', label: 'Boat trips', show: isFeatureEnabled('boats') },
].filter((l) => l.show)

/** Experiences & packages: each opens the WhatsApp enquiry form (packageName goes into the message) */
const packageLinks = [
  { packageName: 'Group Travel', label: 'Group travel' },
  { packageName: 'Wedding Photo Shoot', label: 'Wedding photo shoots' },
  { packageName: 'Tourism Package', label: 'Tourism packages' },
  { packageName: 'Adventure Sports', label: 'Adventure sports' },
]

const exploreLinks = [
  { href: '/blog', label: 'Travel blog', show: isFeatureEnabled('blogs') },
  { href: '/reviews', label: 'Guest reviews', show: true },
  { href: '/about', label: 'About us', show: true },
].filter((l) => l.show)

const legalLinks = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Cancellation & Refunds' },
  { href: '/privacy', label: 'Privacy Policy' },
]

const linkClass = 'text-sm text-white/65 transition-colors hover:text-white'

export function Footer() {
  return (
    <footer className="bg-secondary text-white">
      <div className="page-container pt-14 pb-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {/* Brand mark as-is (a white filter would flatten it); wordmark in white */}
              <Image src="/company-logo-only.svg" alt="Triplovia" width={32} height={32} className="h-8 w-8" />
              <Image src="/company-logo-text-only.svg" alt="Triplovia" width={110} height={26} className="h-6 w-auto brightness-0 invert" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/65">
              Your trusted travel partner for exploring the beautiful coastal Karnataka.
            </p>
            <p className="mt-4 text-xs text-white/45">GST: 29AAZFT3826C1ZO</p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Explore</h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
              {packageLinks.map((p) => (
                <li key={p.packageName}>
                  <PackageEnquiryButton packageName={p.packageName} className={`${linkClass} text-left`}>
                    {p.label}
                  </PackageEnquiryButton>
                </li>
              ))}
              {exploreLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <ListPropertyButton className={`${linkClass} text-left`}>List your property</ListPropertyButton>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Policies</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:triplovia@gmail.com" className={`${linkClass} inline-flex items-center gap-2.5`}>
                  <Mail className="h-4 w-4 shrink-0 text-gold" />
                  triplovia@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+919113887712" className={`${linkClass} inline-flex items-center gap-2.5`}>
                  <Phone className="h-4 w-4 shrink-0 text-gold" />
                  +91 91138 87712
                </a>
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed text-white/65">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  First floor, 612, Honnavar Areangadi Road, Near BSNL Office, Hosakuli, Uttarakannada,
                  Karnataka &ndash; 581334
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} Triplovia. All rights reserved.</p>
          <p className="text-xs text-white/50">Secure payments powered by Razorpay</p>
        </div>
      </div>
    </footer>
  )
}
