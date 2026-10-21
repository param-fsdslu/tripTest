'use client'

/**
 * HotelSearchBox — the detailed hotel search in the homepage hero and on /hotels (MakeMyTrip-style tiles):
 * destination, check-in / check-out (with the number of nights), rooms & guests and price
 * per night, plus stay-type chips. Dates and guests live in useSearchStore; price and stay
 * type only go into the results URL (minPrice/maxPrice,
 * propertyType), which /hotels and HotelFilters already read.
 * On /hotels it starts from the URL (`initial`) and keeps the sidebar filters when searching
 * again (`keepFilters`); price or stay types changed in HotelFilters flow back in through `initial`.
 * `compact` drops the price tile and stay-type chips (the /hotels sidebar filters cover those).
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, differenceInCalendarDays, format, startOfToday } from 'date-fns'
import {
  AlertCircle,
  Baby,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Hotel,
  House,
  IndianRupee,
  Info,
  MapPin,
  Minus,
  Plus,
  Search,
  TreePalm,
  User,
  Users,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, getMaxBookableDate } from '@/lib/utils'
import { useSearchStore } from '@/lib/stores/use-search-store'

const DESTINATION = { name: 'Honnavar', region: 'Uttara Kannada, Karnataka' }

const PRICE_RANGES = [
  { value: 'any', label: 'Any price', min: undefined, max: undefined },
  { value: 'upto-1500', label: 'Up to ₹1,500', min: undefined, max: 1500 },
  { value: '1500-2500', label: '₹1,500 – ₹2,500', min: 1500, max: 2500 },
  { value: '2500-5000', label: '₹2,500 – ₹5,000', min: 2500, max: 5000 },
  { value: '5000-plus', label: '₹5,000+', min: 5000, max: undefined },
] as const

type PriceRange = { min?: number; max?: number }

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** Preset label, or the range HotelFilters' slider set (e.g. "₹1,200 – ₹4,000") */
function priceLabel({ min, max }: PriceRange) {
  const preset = PRICE_RANGES.find((p) => p.min === min && p.max === max)
  if (preset) return preset.label
  if (min !== undefined && max !== undefined) return `${rupees(min)} – ${rupees(max)}`
  return min !== undefined ? `${rupees(min)}+` : `Up to ${rupees(max!)}`
}

const toNumber = (value?: string) => {
  const n = value ? Number(value) : NaN
  return Number.isFinite(n) ? n : undefined
}

const STAY_TYPES = [
  { value: 'homestay', label: 'Homestays', icon: House },
  { value: 'hotel', label: 'Hotels', icon: Hotel },
  { value: 'resort', label: 'Resorts', icon: TreePalm },
  { value: 'villa', label: 'Villas', icon: Building2 },
] as const

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/** Label / big value / hint stack used by every field */
function Tile({
  icon: Icon,
  label,
  sub,
  children,
  error,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  sub: ReactNode
  children: ReactNode
  error?: boolean
}) {
  return (
    <span className="flex min-w-0 flex-col items-start px-4 py-2.5 text-left lg:px-3 xl:px-4">
      <span
        className={cn(
          'flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.1em]',
          error ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0', error ? 'text-destructive' : 'text-primary')} />
        {label}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60 lg:hidden xl:block" />
      </span>
      <span className="mt-1 flex min-h-7 max-w-full items-baseline gap-1 whitespace-nowrap font-heading text-foreground">
        {children}
      </span>
      <span className="mt-0.5 flex max-w-full items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">{sub}</span>
    </span>
  )
}

function DateValue({ date, placeholder }: { date: Date | undefined; placeholder: string }) {
  if (!date) return <span className="text-[15px] font-bold text-muted-foreground/70">{placeholder}</span>
  return (
    <>
      <span className="text-[21px] font-extrabold leading-none xl:text-[22px]">{format(date, 'd')}</span>
      <span className="text-[13px] font-bold xl:text-sm">{format(date, "MMM ''yy")}</span>
    </>
  )
}

function Counter({
  icon: Icon,
  label,
  hint,
  value,
  setValue,
  min,
  max,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  hint: string
  value: number
  setValue: (v: number) => void
  min: number
  max: number
}) {
  const id = `guests-${label.toLowerCase()}`
  // Raw text while typing; the store only gets values within min..max, the rest snaps back on blur
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    const n = Number(text)
    const next = text === '' || Number.isNaN(n) ? value : Math.min(max, Math.max(min, n))
    setValue(next)
    setText(String(next))
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-foreground">{label}</span>
          <span className="block text-[11px] text-muted-foreground">{hint}</span>
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
          className={stepButtonClass}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
            setText(raw)
            const n = Number(raw)
            if (raw !== '' && n >= min && n <= max) setValue(n)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          className="h-9 w-12 rounded-lg border border-input bg-card text-center text-sm font-semibold tabular-nums text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] [appearance:textfield] hover:border-primary/50 focus:border-primary focus:ring-[3px] focus:ring-primary/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => setValue(Math.min(max, value + 1))}
          disabled={value >= max}
          className={stepButtonClass}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const stepButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:border-border disabled:text-muted-foreground/50'

/** Each field: own border on phones, joined into one bordered row with dividers on desktop */
const fieldClass =
  'group w-full rounded-xl border border-border bg-card transition-colors hover:bg-mint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-mint/60 lg:rounded-none lg:border-0'

export interface HotelSearchBoxProps {
  /** Search params to start from (the /hotels URL) */
  initial?: {
    location?: string
    checkIn?: string
    checkOut?: string
    adults?: string
    children?: string
    rooms?: string
    minPrice?: string
    maxPrice?: string
    propertyType?: string
  }
  /** Keep the other params already in the URL (star rating, amenities, sort) when searching */
  keepFilters?: boolean
  /** Destination, dates and guests only; price and stay type are left as they are in the URL */
  compact?: boolean
}

export function HotelSearchBox({ initial, keepFilters = false, compact = false }: HotelSearchBoxProps = {}) {
  const router = useRouter()
  const { checkIn, checkOut, adults, children, rooms, isGuestOpen } = useSearchStore(
    useShallow((s) => ({
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      adults: s.adults,
      children: s.children,
      rooms: s.rooms,
      isGuestOpen: s.isGuestOpen,
    }))
  )
  const { setDateRange, setAdults, setChildren, setRooms, setIsGuestOpen, hydrateFromParams } = useSearchStore(
    useShallow((s) => ({
      hydrateFromParams: s.hydrateFromParams,
      setDateRange: s.setDateRange,
      setAdults: s.setAdults,
      setChildren: s.setChildren,
      setRooms: s.setRooms,
      setIsGuestOpen: s.setIsGuestOpen,
    }))
  )

  const [datesOpen, setDatesOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [price, setPrice] = useState<PriceRange>({})
  const [stayTypes, setStayTypes] = useState<string[]>([])
  const [months, setMonths] = useState(2)

  // Price and stay type follow the URL, which the sidebar filters also change
  const initialMin = initial?.minPrice
  const initialMax = initial?.maxPrice
  const initialTypes = initial?.propertyType
  useEffect(() => {
    setPrice({ min: toNumber(initialMin), max: toNumber(initialMax) })
    setStayTypes(initialTypes ? initialTypes.split(',').filter(Boolean) : [])
  }, [initialMin, initialMax, initialTypes])

  // Dates and guests come from the URL when there is one; otherwise start with tonight → tomorrow,
  // like most booking sites (set on the client to avoid stale SSR dates)
  useEffect(() => {
    if (initial) hydrateFromParams(initial)
    const { checkIn: currentIn, checkOut: currentOut } = useSearchStore.getState()
    if (!currentIn && !currentOut) {
      const today = startOfToday()
      setDateRange(today, addDays(today, 1))
    }
    setMonths(window.matchMedia('(min-width: 768px)').matches ? 2 : 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read the URL once, on mount
  }, [])

  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0
  const anyPrice = price.min === undefined && price.max === undefined

  const guests = adults + children
  const guestBreakdown = `${adults} ${plural(adults, 'adult')} · ${
    children > 0 ? `${children} ${plural(children, 'child', 'children')}` : 'no children'
  }`
  // Every room needs at least one adult
  const changeAdults = (value: number) => {
    setAdults(value)
    if (rooms > value) setRooms(value)
  }

  const pickDate = (day: Date) => {
    // First click (or a click before check-in) sets check-in; the next sets check-out
    if (!checkIn || checkOut || day <= checkIn) {
      setDateRange(day, undefined)
      return
    }
    setDateRange(checkIn, day)
    setDateError(false)
    setDatesOpen(false)
  }

  const toggleStayType = (value: string) =>
    setStayTypes((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]))

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      setDateError(true)
      setDatesOpen(true)
      return
    }
    setDateError(false)

    const params = new URLSearchParams(keepFilters ? window.location.search : '')
    const put = (key: string, value: string | number | undefined) =>
      value === undefined || value === '' ? params.delete(key) : params.set(key, String(value))
    put('location', DESTINATION.name)
    put('checkIn', format(checkIn, 'yyyy-MM-dd'))
    put('checkOut', format(checkOut, 'yyyy-MM-dd'))
    put('adults', adults)
    put('children', children || undefined)
    put('rooms', rooms)
    if (!compact) {
      put('minPrice', price.min)
      put('maxPrice', price.max)
      put('propertyType', stayTypes.join(','))
    }

    router.push(`/hotels?${params.toString()}`)
  }

  return (
    <div className={cn('space-y-3', compact ? 'p-0.5' : 'p-1')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            'grid flex-1 grid-cols-2 gap-2 lg:gap-0 lg:divide-x lg:divide-border lg:overflow-hidden lg:rounded-xl lg:border lg:border-border',
            compact ? 'lg:grid-cols-[0.9fr_1.6fr_1.15fr]' : 'lg:grid-cols-[0.95fr_1.7fr_1.25fr_0.95fr]'
          )}
        >
          {/* Destination */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={cn(fieldClass, 'col-span-2 lg:col-span-1')}>
                <Tile icon={MapPin} label="Destination" sub={DESTINATION.region}>
                  <span className="truncate text-[19px] font-extrabold leading-none">{DESTINATION.name}</span>
                </Tile>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Destinations
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-mint/60 px-2 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">{DESTINATION.name}</span>
                  <span className="block text-xs text-muted-foreground">{DESTINATION.region}</span>
                </span>
                <Check className="h-4 w-4 text-primary" />
              </div>
              <p className="px-2 pb-1 pt-2.5 text-xs text-muted-foreground">More coastal destinations coming soon.</p>
            </PopoverContent>
          </Popover>

          {/* Check-in / check-out */}
          <Popover open={datesOpen} onOpenChange={setDatesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  fieldClass,
                  'relative col-span-2 grid grid-cols-2 divide-x divide-border lg:col-span-1',
                  dateError && 'border-destructive ring-1 ring-destructive lg:ring-inset'
                )}
              >
                <Tile
                  icon={CalendarDays}
                  label="Check-in"
                  sub={checkIn ? format(checkIn, 'EEEE') : 'Select a date'}
                  error={dateError && !checkIn}
                >
                  <DateValue date={checkIn} placeholder="Add date" />
                </Tile>
                <Tile
                  icon={CalendarDays}
                  label="Check-out"
                  sub={
                    checkOut ? (
                      <>
                        {format(checkOut, 'EEEE')}
                        {nights > 0 && (
                          <span className="rounded-full bg-mint px-1.5 py-px text-[10px] font-semibold text-primary">
                            {nights} {plural(nights, 'night')}
                          </span>
                        )}
                      </>
                    ) : (
                      'Select a date'
                    )
                  }
                  error={dateError && !checkOut}
                >
                  <DateValue date={checkOut} placeholder="Add date" />
                </Tile>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {!checkIn || checkOut ? 'Select your check-in date' : 'Now select your check-out date'}
                </p>
                {nights > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {nights} {plural(nights, 'night')}
                  </span>
                )}
              </div>
              <Calendar
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={(_range, day) => pickDate(day)}
                numberOfMonths={months}
                defaultMonth={checkIn}
                disabled={(date) => date < startOfToday() || date > getMaxBookableDate()}
                toDate={getMaxBookableDate()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Rooms & guests */}
          <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={cn(fieldClass, compact && 'col-span-2 lg:col-span-1')}>
                <Tile icon={Users} label="Rooms & Guests" sub={guestBreakdown}>
                  <span className="text-[21px] font-extrabold leading-none xl:text-[22px]">{guests}</span>
                  <span className="text-[13px] font-bold xl:text-sm">{plural(guests, 'Guest')}</span>
                  <span aria-hidden="true" className="mx-1.5 h-4 w-px self-center bg-border" />
                  <span className="text-[21px] font-extrabold leading-none xl:text-[22px]">{rooms}</span>
                  <span className="text-[13px] font-bold xl:text-sm">{plural(rooms, 'Room')}</span>
                </Tile>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[384px] max-w-[calc(100vw-2rem)] p-0">
              <div className="border-b border-border px-4 pb-3 pt-4">
                <p className="font-heading text-sm font-bold text-foreground">Who&apos;s travelling?</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {guests} {plural(guests, 'guest')} in {rooms} {plural(rooms, 'room')} · {guestBreakdown}
                </p>
              </div>
              <div className="divide-y divide-border px-4 py-1">
                <Counter icon={User} label="Adults" hint="Age 12 and above" value={adults} setValue={changeAdults} min={1} max={24} />
                <Counter icon={Baby} label="Children" hint="Age 0 – 11" value={children} setValue={setChildren} min={0} max={12} />
                <Counter
                  icon={BedDouble}
                  label="Rooms"
                  hint="At least one adult per room"
                  value={rooms}
                  setValue={setRooms}
                  min={1}
                  max={Math.min(8, adults)}
                />
              </div>
              <div className="mx-4 mb-3 rounded-lg bg-mint/60 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Good to know
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-muted-foreground marker:text-primary/60">
                  <li>Guests aged 12 and above count as adults.</li>
                  <li>Extra beds and child policies vary by stay. Check the property rules before booking.</li>
                  <li>
                    Booking more than 8 rooms or a large group? Call{' '}
                    <a href="tel:+919113887712" className="font-semibold text-primary hover:underline">
                      +91 91138 87712
                    </a>
                    .
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{guests}</span> {plural(guests, 'guest')},{' '}
                  <span className="font-semibold text-foreground">{rooms}</span> {plural(rooms, 'room')}
                </p>
                <Button type="button" size="sm" className="px-5" onClick={() => setIsGuestOpen(false)}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Price per night */}
          {!compact && (
            <Popover open={priceOpen} onOpenChange={setPriceOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={fieldClass}>
                  <Tile icon={IndianRupee} label="Price / night" sub={anyPrice ? 'All budgets' : 'Per room, per night'}>
                    <span className="truncate text-sm font-bold leading-7 xl:text-[15px]">{priceLabel(price)}</span>
                  </Tile>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-1.5">
                {PRICE_RANGES.map((range) => {
                  const selected = range.min === price.min && range.max === price.max
                  return (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => {
                        setPrice({ min: range.min, max: range.max })
                        setPriceOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-mint/60',
                        selected ? 'font-semibold text-primary' : 'text-foreground'
                      )}
                    >
                      {range.label}
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  )
                })}
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSearch}
          className="h-12 rounded-xl px-8 text-sm font-bold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] lg:h-auto lg:min-w-[124px] lg:px-5 xl:min-w-[150px] xl:px-8"
        >
          <Search className="h-5 w-5" />
          Search
        </Button>
      </div>

      {dateError && (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Please select your check-in and check-out dates
        </p>
      )}

      {/* Stay type chips */}
      {!compact && (
        <div className="flex items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BedDouble className="h-3.5 w-3.5 text-primary" />
            Looking for
          </span>
          {STAY_TYPES.map(({ value, label, icon: Icon }) => {
            const active = stayTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStayType(value)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-mint/60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
