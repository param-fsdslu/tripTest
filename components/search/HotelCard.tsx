'use client'

/**
 * HotelCard — result card for the hotel search list and the wishlist grid.
 *
 * Layout follows the card's own width (container query): from 36rem wide it is a row
 * (photo left, details middle, rating + price right, like MakeMyTrip's results); narrower,
 * e.g. in the wishlist grid, it stacks photo, details and a price row.
 *
 * Image carousel: images are sorted primary-first, then by display_order.
 * e.preventDefault() + e.stopPropagation() on carousel controls prevent the
 * photo's Link wrapper from navigating when clicking prev/next.
 *
 * Prices displayed use getInclusivePrice() from lib/utils.ts which applies
 * the configured tax and service fee multiplier to the base room price.
 */
import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Star, MapPin, Hotel, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import { cn, formatCurrency, getInclusivePrice } from '@/lib/utils'

interface HotelCardProps {
  hotel: {
    id: string
    name: string
    slug: string
    description?: string
    star_rating?: number
    property_type?: string
    city: string
    state: string
    country: string
    location_rating?: number
    avg_rating?: number
    review_count?: number
    hotel_images?: Array<{
      id: string
      image_url: string
      alt_text?: string
      is_primary: boolean
      display_order: number
    }>
    minPrice: number
    maxPrice: number
    /** Cheapest room price within the active price filter range. Falls back to minPrice when absent. */
    displayPrice?: number
  }
}

/** Guest rating (0–5) in words */
function ratingWord(rating: number) {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 4) return 'Very good'
  if (rating >= 3.5) return 'Good'
  return 'Rated'
}

function GuestRating({ rating, count, className }: { rating?: number; count?: number; className?: string }) {
  if (!rating) {
    return (
      <span className={cn('inline-flex items-center rounded-md bg-mint px-2 py-0.5 text-xs font-semibold text-primary', className)}>
        New
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="text-right leading-tight">
        <span className="block text-[13px] font-semibold text-foreground">{ratingWord(rating)}</span>
        {!!count && (
          <span className="block text-[11px] text-muted-foreground">
            {count} {count === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </span>
      <span className="rounded-lg rounded-bl-none bg-primary px-2 py-1 font-heading text-sm font-bold text-white">
        {rating.toFixed(1)}
      </span>
    </span>
  )
}

export function HotelCard({ hotel }: HotelCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // Photos that failed to load are dropped so the card falls back to the placeholder
  const [brokenIds, setBrokenIds] = useState<string[]>([])

  const sortedImages = [...(hotel.hotel_images || [])]
    .filter((img) => !brokenIds.includes(img.id))
    .sort((a, b) => {
      if (a.is_primary) return -1
      if (b.is_primary) return 1
      return a.display_order - b.display_order
    })
  const activeIndex = Math.min(currentIndex, Math.max(sortedImages.length - 1, 0))

  const hasMultiple = sortedImages.length > 1
  const href = `/hotels/${hotel.slug}`
  const type = hotel.property_type ? hotel.property_type.charAt(0).toUpperCase() + hotel.property_type.slice(1) : null

  const goTo = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex(index)
  }, [])

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex((p) => (p === 0 ? sortedImages.length - 1 : p - 1))
  }, [sortedImages.length])

  const goNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setCurrentIndex((p) => (p === sortedImages.length - 1 ? 0 : p + 1))
  }, [sortedImages.length])

  return (
    <div className="@container h-full">
      <article
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card
                   transition-colors duration-300 hover:border-primary/25
                   @xl:flex-row"
      >
        {/* ── Photo carousel ───────────────────────────────── */}
        <div className="relative aspect-4/3 shrink-0 overflow-hidden bg-muted @xl:aspect-auto @xl:min-h-[232px] @xl:w-[38%]">
          <Link href={href} className="absolute inset-0" tabIndex={-1}>
            {sortedImages.length > 0 ? (
              sortedImages.map((img, index) => (
                <div
                  key={img.id}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-300',
                    index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                  )}
                >
                  <Image
                    src={img.image_url}
                    alt={img.alt_text || `${hotel.name} photo ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    sizes="(min-width: 640px) 380px, 100vw"
                    priority={index === 0}
                    onError={() => setBrokenIds((ids) => [...ids, img.id])}
                  />
                </div>
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-mint">
                <Hotel className="h-10 w-10 text-primary/40" />
              </div>
            )}
          </Link>

          {type && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-secondary backdrop-blur-sm">
              {type}
            </span>
          )}

          <WishlistButton hotelId={hotel.id} className="absolute right-3 top-3 z-10 shadow-none" />

          {hasMultiple && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full
                           bg-white/85 opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full
                           bg-white/85 opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>

              <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
                {sortedImages.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => goTo(i, e)}
                    className={cn(
                      'rounded-full transition-all',
                      i === activeIndex ? 'h-1.5 w-3.5 bg-white' : 'h-1.5 w-1.5 bg-white/55 hover:bg-white/80'
                    )}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
                {sortedImages.length > 5 && (
                  <span className="ml-0.5 text-[9px] text-white">+{sortedImages.length - 5}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Details ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col @xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col p-4 @xl:p-5">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              {hotel.star_rating ? (
                <span className="inline-flex items-center gap-0.5" aria-label={`${hotel.star_rating} star property`}>
                  {Array.from({ length: hotel.star_rating }, (_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                  ))}
                </span>
              ) : (
                <span />
              )}
              {/* Narrow cards show the guest rating here; wide ones in the price column */}
              <GuestRating rating={hotel.avg_rating} count={hotel.review_count} className="@xl:hidden" />
            </div>

            <h3 className="font-heading text-lg font-bold leading-snug text-foreground line-clamp-2 @xl:text-xl">
              <Link href={href} className="transition-colors hover:text-primary">
                {hotel.name}
              </Link>
            </h3>

            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {hotel.city}, {hotel.state}
              </span>
            </p>

            {hotel.description && (
              <p className="mt-3 hidden text-[13px] leading-relaxed text-muted-foreground @xl:line-clamp-3">
                {hotel.description}
              </p>
            )}
          </div>

          {/* ── Rating + price ─────────────────────────────── */}
          <div
            className="mt-auto flex items-end justify-between gap-3 border-t border-border px-4 py-3.5
                       @xl:mt-0 @xl:w-52 @xl:shrink-0 @xl:flex-col @xl:items-end @xl:border-l @xl:border-t-0 @xl:p-5"
          >
            <GuestRating rating={hotel.avg_rating} count={hotel.review_count} className="hidden @xl:inline-flex" />

            <div className="flex w-full items-end justify-between gap-3 @xl:flex-col @xl:items-end @xl:gap-3">
              <div className="@xl:text-right">
                {/* "from" only when showing the overall minimum (no price filter active) */}
                {!hotel.displayPrice && <p className="text-[11px] font-medium text-muted-foreground">Starting from</p>}
                <p className="font-heading text-xl font-extrabold leading-tight text-foreground @xl:text-2xl">
                  {formatCurrency(getInclusivePrice(hotel.displayPrice ?? hotel.minPrice))}
                </p>
                <p className="text-[11px] text-muted-foreground">per night · incl. taxes &amp; fees</p>
              </div>

              <Link
                href={href}
                className="group/cta inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5
                           text-sm font-semibold text-white transition-colors hover:bg-primary-hover @xl:w-full"
              >
                View stay
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
