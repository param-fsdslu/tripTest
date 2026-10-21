'use client'

/**
 * RoomAvailabilityCard — beside the hotel page photos: room types as large full-photo cards
 * (name, nightly price incl. taxes, capacity and availability for the searched dates over the
 * room photo). Desktop stacks two beside the gallery; phones swipe through all of them.
 * "Select" jumps to that room in the rooms list.
 */
import Image from 'next/image'
import { ArrowRight, BedDouble, Users } from 'lucide-react'
import { cn, formatCurrency, getInclusivePrice } from '@/lib/utils'

export interface AvailabilityRoom {
  id: string
  name: string
  base_price: number
  /** Price for the searched dates (weekend/festival pricing), when dates are known */
  current_price?: number
  max_occupancy: number
  num_available_rooms: number
  status: string
  room_type_images?: Array<{ image_url: string; alt_text?: string }>
}

/** Big cards shown beside the gallery on desktop; the rest are one click away */
const DESKTOP_CARDS = 2

function availability(room: AvailabilityRoom) {
  if (room.status !== 'available' || room.num_available_rooms === 0) {
    return { label: 'Sold out', soldOut: true, text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' }
  }
  if (room.num_available_rooms <= 3) {
    return { label: `Only ${room.num_available_rooms} left`, soldOut: false, text: 'text-red-600', dot: 'bg-red-500' }
  }
  return { label: 'Available', soldOut: false, text: 'text-primary', dot: 'bg-primary' }
}

interface RoomAvailabilityCardProps {
  rooms: AvailabilityRoom[]
  /** e.g. "Sat 17 Oct – Sun 18 Oct · 2 guests"; undefined when no dates were searched */
  stayLabel?: string
  onSelectRoom: (roomId: string) => void
  onViewAll: () => void
  className?: string
}

export function RoomAvailabilityCard({ rooms, stayLabel, onSelectRoom, onViewAll, className }: RoomAvailabilityCardProps) {
  const openCount = rooms.filter((room) => !availability(room).soldOut).length
  const hiddenOnDesktop = Math.max(rooms.length - DESKTOP_CARDS, 0)

  return (
    <section aria-label="Room availability" className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold leading-tight text-foreground">Availability</h2>
          <p className="text-xs text-muted-foreground">{stayLabel ?? 'Standard nightly prices'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-primary">
          {openCount} of {rooms.length} open
        </span>
      </div>

      {/* Phones: swipe sideways; desktop: big cards stacked to the gallery's height */}
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-1 lg:snap-none lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {rooms.map((room, index) => {
          const status = availability(room)
          const photo = room.room_type_images?.[0]
          return (
            <article
              key={room.id}
              className={cn(
                'group relative isolate flex h-56 w-[85%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl bg-secondary p-4 text-white',
                'sm:w-[60%] lg:h-auto lg:min-h-[200px] lg:w-auto lg:flex-1',
                index >= DESKTOP_CARDS && 'lg:hidden'
              )}
            >
              {photo ? (
                <Image
                  src={photo.image_url}
                  alt={photo.alt_text || room.name}
                  fill
                  sizes="(min-width: 1024px) 380px, 85vw"
                  className={cn(
                    '-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105',
                    status.soldOut && 'grayscale'
                  )}
                />
              ) : (
                <div className="absolute inset-0 -z-10 flex items-center justify-center bg-linear-to-br from-primary to-secondary">
                  <BedDouble className="h-12 w-12 text-white/25" />
                </div>
              )}
              {/* Legibility: dark at the bottom for the details, light at the top for the chips */}
              <div className="absolute inset-0 -z-10 bg-linear-to-t from-secondary via-secondary/45 to-transparent" />
              <div className="absolute inset-x-0 top-0 -z-10 h-20 bg-linear-to-b from-black/35 to-transparent" />

              {/* Top: availability + capacity */}
              <div className="flex items-start justify-between gap-2">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow-sm', status.text)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                  {status.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
                  <Users className="h-3 w-3" />
                  Up to {room.max_occupancy}
                </span>
              </div>

              {/* Bottom: name, price, select */}
              <div>
                <h3 className="text-xl font-extrabold leading-tight tracking-tight text-balance">{room.name}</h3>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="leading-tight">
                    <span className="font-heading text-2xl font-extrabold">
                      {formatCurrency(getInclusivePrice(room.current_price ?? room.base_price))}
                    </span>
                    <span className="ml-1 text-xs text-white/75">/ night</span>
                    <span className="block text-[10px] text-white/65">Incl. taxes &amp; fees</span>
                  </p>
                  <button
                    type="button"
                    disabled={status.soldOut}
                    onClick={() => onSelectRoom(room.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-muted-foreground"
                  >
                    {status.soldOut ? 'Sold out' : 'Select'}
                    {!status.soldOut && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {hiddenOnDesktop > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="hidden items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-mint/50 lg:flex"
        >
          View all {rooms.length} room types
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}
