import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Amounts paid or charged: ₹7,664 for whole rupees, ₹17,751.20 / ₹0.07 otherwise (never one decimal, never rounded away) */
export function formatRupees(amount: number): string {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded)
}

// ─── Dynamic room pricing (weekend / festival / long-weekend / custom) ──────
/**
 * Minimal shape of a price_rules row needed to resolve a night's price.
 * Matches lib/types/hotel.ts PriceRule.
 */
export interface PriceRuleInput {
  room_type_id: string
  valid_from: string
  valid_to: string
  price_per_night: number
  day_of_week: number | null
  is_active: boolean
  price_type: 'weekend' | 'festival' | 'long_weekend' | 'custom'
  label?: string | null
}

export interface NightlyPrice {
  date: string
  price: number
  label?: string | null
  priceType?: PriceRuleInput['price_type']
}

/**
 * Resolves the price for one night of one room type.
 * Precedence: an active festival/long_weekend/custom rule covering the date wins;
 * otherwise an active weekend rule whose day_of_week matches applies;
 * otherwise base_price.
 */
export function getRoomPriceForNight(
  roomType: { id: string; base_price: number },
  date: string,
  priceRules: PriceRuleInput[]
): NightlyPrice {
  const dow = new Date(`${date}T00:00:00`).getDay()
  const applicable = priceRules.filter(
    (r) =>
      r.room_type_id === roomType.id &&
      r.is_active &&
      r.valid_from <= date &&
      r.valid_to >= date &&
      (r.day_of_week === null || r.day_of_week === dow)
  )

  const override = applicable.find((r) => r.price_type !== 'weekend')
  if (override) return { date, price: override.price_per_night, label: override.label, priceType: override.price_type }

  const weekendRule = applicable.find((r) => r.price_type === 'weekend')
  if (weekendRule) return { date, price: weekendRule.price_per_night, label: weekendRule.label || 'Weekend', priceType: 'weekend' }

  return { date, price: roomType.base_price }
}

/** Returns each night's date (YYYY-MM-DD) in [checkIn, checkOut). */
export function getStayNightDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${checkIn}T00:00:00`)
  const end = new Date(`${checkOut}T00:00:00`)
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Sums the resolved nightly price across a stay for numRooms of one room type. */
export function calculateRoomStayPricing(
  roomType: { id: string; base_price: number },
  checkIn: string,
  checkOut: string,
  numRooms: number,
  priceRules: PriceRuleInput[]
): { subtotal: number; nights: NightlyPrice[] } {
  const nights = getStayNightDates(checkIn, checkOut).map((date) =>
    getRoomPriceForNight(roomType, date, priceRules)
  )
  const subtotal = nights.reduce((sum, n) => sum + n.price, 0) * numRooms
  return { subtotal, nights }
}

// ─── Booking window ──────────────────────────────────────────────────────────
/** Guests can only book up to this many months ahead of today. */
export const MAX_BOOKING_MONTHS_AHEAD = 6

/**
 * Rolling cap on how far in advance a check-in/trip date can be booked.
 * Recomputed from "now" on every call so the window moves forward daily
 * without any admin action.
 */
export function getMaxBookableDate(): Date {
  const max = new Date()
  max.setMonth(max.getMonth() + MAX_BOOKING_MONTHS_AHEAD)
  return max
}

/** True if dateStr (YYYY-MM-DD) is within the rolling booking window. */
export function isWithinBookingWindow(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00`)
  return date <= getMaxBookableDate()
}

// ─── Extra bed / additional guest pricing ───────────────────────────────────
export interface ExtraBedRoomSelection {
  /** Number of rooms booked of this room type. */
  qty: number
  /** Guests included in base_price per room before extra_bed_price applies. */
  standardOccupancy: number
  /** Max guests per room of this type — caps how many extra beds can be added. */
  maxOccupancy: number
  /** Per-guest, per-night charge for guests beyond standardOccupancy. */
  extraBedPrice: number
}

/**
 * Computes the total extra-bed/additional-guest charge across one or more room-type
 * selections for a stay. Guests are counted against each selection's standard
 * capacity (qty x standardOccupancy) first; any guests beyond total standard
 * capacity are billed against each selection's remaining extra capacity
 * (qty x (maxOccupancy - standardOccupancy)), in the order the selections are given,
 * at that room type's own extra_bed_price.
 */
export function calculateExtraBedCharge(
  selections: ExtraBedRoomSelection[],
  totalGuests: number,
  nights: number
): number {
  const totalStandardCapacity = selections.reduce((sum, s) => sum + s.qty * s.standardOccupancy, 0)
  let overflow = Math.max(0, totalGuests - totalStandardCapacity)
  let charge = 0

  for (const sel of selections) {
    if (overflow <= 0) break
    const extraCapacity = sel.qty * Math.max(0, sel.maxOccupancy - sel.standardOccupancy)
    const used = Math.min(overflow, extraCapacity)
    charge += used * sel.extraBedPrice * nights
    overflow -= used
  }

  return charge
}

// ─── Phone validation ────────────────────────────────────────────────────────
/** Accepts Indian mobile numbers: 10 digits, optional +91/91/0 prefix, optional spaces/dashes. */
const PHONE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/

/** Returns true if the phone string is a valid Indian mobile number. */
export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.replace(/[\s-]/g, ''))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

// ─── GST details (business bookings) ─────────────────────────────────────────
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** State code (2 digits) + PAN (5 letters, 4 digits, 1 letter) + entity number + 'Z' + check character */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** "29 aazft3826c1zo" → "29AAZFT3826C1ZO" */
export function normalizeGstin(input: string): string {
  return input.replace(/\s/g, '').toUpperCase()
}

/** A GSTIN with the right shape and check character (catches most typos) */
export function isValidGstin(input: string): boolean {
  const gstin = normalizeGstin(input)
  if (!GSTIN_RE.test(gstin)) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === gstin[14]
}

/** Optional GST details a guest adds to a booking so the property can bill their company */
export interface GstDetailsInput {
  gstNumber: string
  companyName: string
  companyAddress: string
}

export const GST_COMPANY_NAME_MAX = 120
export const GST_COMPANY_ADDRESS_MAX = 300

/**
 * Validates GST details from a booking request into booking columns. Absent → null (none given);
 * anything given must be complete and valid.
 */
export function parseGstDetails(
  input: unknown
):
  | { ok: true; value: { gst_number: string; gst_company_name: string; gst_company_address: string } | null }
  | { ok: false; error: string } {
  if (input == null) return { ok: true, value: null }
  const raw = input as Partial<Record<keyof GstDetailsInput, unknown>>
  const gstNumber = typeof raw.gstNumber === 'string' ? normalizeGstin(raw.gstNumber) : ''
  const companyName = typeof raw.companyName === 'string' ? raw.companyName.trim() : ''
  const companyAddress = typeof raw.companyAddress === 'string' ? raw.companyAddress.trim() : ''
  if (!isValidGstin(gstNumber)) return { ok: false, error: 'Please enter a valid 15-character GSTIN' }
  if (!companyName || companyName.length > GST_COMPANY_NAME_MAX) {
    return { ok: false, error: 'Please enter the registered company name' }
  }
  if (!companyAddress || companyAddress.length > GST_COMPANY_ADDRESS_MAX) {
    return { ok: false, error: 'Please enter the registered company address' }
  }
  return { ok: true, value: { gst_number: gstNumber, gst_company_name: companyName, gst_company_address: companyAddress } }
}

// ─── Tax constants ───────────────────────────────────────────────────────────
export const MEAL_GST_RATE = 0.05;             // 5% flat GST on add-on meals
export const SERVICE_CHARGE_RATE = 0.06;        // 6% service charge on room subtotal
export const GST_ON_SERVICE_CHARGE_RATE = 0.18; // 18% GST on the service charge

// ─── Room GST slab helper ─────────────────────────────────────────────────────
/**
 * Determines the room GST rate from the per-room base price (not the booking total).
 * Slabs: <₹1000 → 0%, ₹1000–₹7500 → 5%, >₹7500 → 18%.
 */
export function getRoomGstRate(pricePerRoom: number): number {
  if (pricePerRoom < 1000) return 0;
  if (pricePerRoom <= 7500) return 0.05;
  return 0.18;
}

// ─── Tax breakdown ────────────────────────────────────────────────────────────
export interface TaxBreakdown {
  /** Room accommodation subtotal (pricePerRoom × rooms × nights). */
  roomSubtotal: number;
  /** Meal plan add-on total before tax. */
  mealSubtotal: number;
  /** roomSubtotal + mealSubtotal — combined pre-tax base for display. */
  taxableBase: number;
  /** Room GST rate determined by per-room price (0, 0.05, or 0.18). */
  gstRate: number;
  /** GST on room subtotal at the applicable slab rate. */
  roomGstAmount: number;
  /** 5% GST on meal plan subtotal. */
  mealGstAmount: number;
  /** Alias for roomGstAmount — kept for compatibility with existing callers. */
  gstAmount: number;
  /** 6% service charge on room subtotal. */
  serviceCharge: number;
  /** 18% GST levied on the service charge. */
  gstOnServiceCharge: number;
  /** Sum of all tax components. */
  totalTax: number;
  /** Final payable amount (taxableBase + totalTax). */
  totalAmount: number;
}

/**
 * Calculates the full tax breakdown per the updated GST structure:
 *
 *   Step 1 — Room GST slab (per-room price, not total):
 *              <₹1000 → 0%,  ₹1000–₹7500 → 5%,  >₹7500 → 18%
 *   Step 2 — Meal GST: flat 5% on mealPlanTotal (billed separately)
 *   Step 3 — Service charge: 6% of room subtotal
 *   Step 4 — GST on service charge: 18% of service charge
 *   Step 5 — totalAmount = (roomSubtotal + mealPlanTotal) + all taxes
 *
 * @param pricePerRoom  per-unit room base price, used only to determine the GST slab
 * @param roomSubtotal  total room cost (pricePerRoom × rooms × nights)
 * @param mealPlanTotal add-on meal total; taxed separately at 5%
 */
export function calculateBookingTax(
  pricePerRoom: number,
  roomSubtotal: number,
  mealPlanTotal: number = 0
): TaxBreakdown {
  const gstRate = getRoomGstRate(pricePerRoom);
  const roomGstAmount = roomSubtotal * gstRate;
  const mealGstAmount = mealPlanTotal * MEAL_GST_RATE;
  const serviceCharge = roomSubtotal * SERVICE_CHARGE_RATE;
  const gstOnServiceCharge = serviceCharge * GST_ON_SERVICE_CHARGE_RATE;
  const taxableBase = roomSubtotal + mealPlanTotal;
  const totalTax = roomGstAmount + mealGstAmount + serviceCharge + gstOnServiceCharge;
  const totalAmount = taxableBase + totalTax;

  return {
    roomSubtotal,
    mealSubtotal: mealPlanTotal,
    taxableBase,
    gstRate,
    roomGstAmount,
    mealGstAmount,
    gstAmount: roomGstAmount,
    serviceCharge,
    gstOnServiceCharge,
    totalTax,
    totalAmount,
  };
}

/**
 * Returns the all-inclusive display price for a single-night base price (no meals).
 * Used on hotel cards, room cards, and price-range summaries.
 */
export function getInclusivePrice(basePrice: number): number {
  return Math.round(calculateBookingTax(basePrice, basePrice, 0).totalAmount);
}
