# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build (Turbopack)
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test:db      # Tests for the Firestore data layer (lib/db) against an in-memory store
```

Copy Supabase data into Firebase (one-time, re-runnable): `node --env-file=.env scripts/migrate-supabase-to-firebase.mjs [--dry-run] [--only=tables,users,storage]`

Add shadcn/ui components: `pnpm dlx shadcn@latest add <component>`

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.7 |
| Language | TypeScript | 5.x |
| React | React | 19.1.0 |
| Styling | Tailwind CSS 4 (PostCSS) | 4.x |
| UI Library | shadcn/ui (New York style) | — |
| Icons | Lucide React | 0.554.0 |
| State (server) | TanStack Query | 5.90.12 |
| State (client) | Zustand | 5.0.11 |
| Database | Firebase Firestore (server-only, via firebase-admin) | 14.5.0 |
| Auth | Firebase Authentication (email/password, Google, phone OTP; session cookies) | firebase-admin 14.5.0 / firebase (browser, auth only) 12.19.0 |
| Storage | Firebase Storage | via firebase-admin |
| Payments | Razorpay | 2.9.4 |
| Email | Resend + React Email | 6.6.0 |
| i18n | next-intl | 4.5.5 |
| Forms | React Hook Form + Zod | 7.68.0 / 4.1.13 |
| Rich Text | Tiptap | 3.15.3 |
| Dates | date-fns + react-day-picker | 4.1.0 / 9.11.3 |

## Architecture Overview

**Honnavar Travels** — a travel booking platform (hotels + boats) built with Next.js 15 App Router, TypeScript, Firebase (Firestore, Auth, Storage), and Razorpay payments. The app moved from Supabase to Firebase; `schema.sql` and `supabase/` are kept only as a reference for the old Postgres schema.

### Project Structure

```
app/
├── [locale]/(guest)/         # Public: hotels/, boats/, blog/
├── [locale]/auth/            # Auth: login, signup, forgot-password, reset-password, callback
├── [locale]/(account)/       # Protected guest area: profile/, bookings/, wishlist/ (dashboard/ only redirects to bookings/)
│                             #   layout.tsx = site Navbar + account/AccountSidebar + Footer
├── [locale]/boat-bookings/   # Protected: boat bookings
├── [locale]/payment/         # Payment success page
├── admin/                    # Admin panel (no locale prefix)
│   ├── analytics/, blogs/, boats/, boat-bookings/
│   ├── bookings/, hotels/, payments/, refunds/
│   ├── rooms/, settings/, users/
└── api/                      # API routes (no locale prefix)
    ├── blogs/, boats/, boat-bookings/, bookings/, hotels/
    └── payment/ (create-order, verify, refund, webhook)

components/
├── ui/           # shadcn/ui primitives (button, card, dialog, popover, tabs, etc.)
├── admin/        # Admin: HotelForm, BoatForm, BookingsTable, BoatsTable, ImagesManager, etc.
├── booking/      # BookingForm, BoatBookingForm, BookingConfirmation, BoatBookingConfirmation
├── search/       # SearchWidget, HotelSearchBox, HotelFilters, BoatFilters, HotelCard, BoatCard, results
├── hotel/        # HotelDetailsClient
├── boat/         # Boat detail components
├── reviews/      # ReviewDialog, BoatReviewDialog
├── payment/      # RazorpayButton
└── auth/         # Login, signup, password reset forms

lib/
├── actions/      # Server actions ('use server')
│   ├── admin/    # Hotel admin CRUD (barrel: admin/index.ts)
│   │   ├── _helpers.ts, stats.ts, hotels.ts, hotel-images.ts, hotel-amenities.ts
│   │   ├── room-types.ts, room-type-images.ts, room-type-amenities.ts
│   │   ├── bookings.ts, payments.ts, meal-plans.ts
│   ├── auth.ts, bookings.ts, blogs.ts, reviews.ts, users.ts
│   ├── boat-admin.ts, boat-bookings.ts, boat-reviews.ts
│   ├── session.ts (current user/profile for client components), uploads.ts (user image uploads)
├── services/     # Business logic
│   ├── email.service.ts, booking.service.ts, hotel.service.ts
│   ├── boat.service.ts, boat-booking.service.ts
│   ├── booking-notifications.service.ts, whatsapp.service.ts (booking confirmed → email + WhatsApp)
├── hooks/        # TanStack Query hooks
│   ├── use-hotels.ts, use-boats.ts, use-auth-query.ts, use-wishlist.ts, useRazorpay.ts
├── stores/       # Zustand stores (providerless, no wrapper needed)
│   ├── use-search-store.ts, use-booking-store.ts, use-ui-store.ts
├── db/           # Firestore data layer: server.ts (createClient/createAdminClient), query builder,
│                 #   schema.ts (tables), policies.ts (row access), hooks.ts (triggers), __tests__/
├── firebase/     # admin.ts (SDK init), storage.ts, auth/ (session, users, identity REST, emails)
├── razorpay/     # config.ts (instance, key, currency, script URL)
├── providers/    # query-provider.tsx (TanStack Query)
├── config/       # features.ts (feature flags)
├── utils/        # admin.ts, roles.ts, storage.ts
├── types/        # Domain-split types (barrel: types/index.ts)
│   ├── common.ts, hotel.ts, boat.ts, auth.ts
└── utils.ts      # cn(), formatCurrency()
```

## Routing & Middleware

### Middleware (`middleware.ts`)

Processing order:
1. **Feature flag blocking** — `isRouteBlocked()` returns 404 for disabled features
2. **API early return** — `/api/*` routes skip everything below (only feature blocking applies)
3. **Admin route handling** — `/admin/*` skips i18n; `app/admin/layout.tsx` checks session and role
4. **Protected route guards** — `/dashboard`, `/profile`, `/settings` → redirect to login if there is no `__session` cookie
5. **next-intl routing** — locale detection and prefixing (en/es/fr)

Middleware runs on the edge, where firebase-admin can't run, so it only checks cookie presence. Pages verify sessions: protected pages redirect to login when invalid; `auth/login` and `auth/signup` pages redirect signed-in users to My Bookings (`/bookings`, also the default post-sign-in target in `safeRedirect`). Import only `lib/firebase/auth/constants.ts` from middleware.
Matcher: `['/', '/(en|es|fr)/:path*', '/admin/:path*', '/api/:path*', '/((?!_next|_vercel|.*\\..*).*))']`

## Feature Flags (`lib/config/features.ts`)

Simple config file to toggle entire feature modules on/off for all users (guest, admin, super_admin):

```typescript
export const FEATURES: Record<FeatureName, boolean> = {
  hotels: true,
  boats: false,   // Set to true to enable
  blogs: true,
  cabs: false,    // Not yet implemented
  bikes: false,   // Not yet implemented
}
```

When a feature is disabled:
- Hidden from: guest navbar, admin sidebar, search widget tabs, homepage sections, footer links
- Hero subtitle dynamically lists only enabled services
- Direct URL access returns 404 via middleware (covers guest, admin, and API routes)
- Route-to-feature mapping: `hotels` → `/hotels`, `/bookings`; `boats` → `/boats`, `/boat-bookings`; `blogs` → `/blog`, `/blogs`

Integration points: `Navbar.tsx`, `AdminNav.tsx`, `SearchWidget.tsx`, `Hero.tsx`, `app/[locale]/page.tsx`, `middleware.ts`

## State Management

### TanStack Query v5 (Server State)

Provider: `lib/providers/query-provider.tsx`
Config: 5min staleTime, 10min gcTime, 2 retries, exponential backoff, refetchOnWindowFocus in prod only

| Hook | File | Purpose |
|------|------|---------|
| `useHotels(params)` | `use-hotels.ts` | Search hotels with filters |
| `useFeaturedHotels(limit)` | `use-hotels.ts` | Homepage featured (10min stale) |
| `useHotelBySlug(slug)` | `use-hotels.ts` | Hotel detail page |
| `useFeaturedBoats(limit)` | `use-boats.ts` | Homepage featured (10min stale) |
| `useBoatBySlug(slug)` | `use-boats.ts` | Boat detail page |
| `useAvailableSlots(tripTypeId, date)` | `use-boats.ts` | Boat time slot availability (2min stale) |
| `useUser()` | `use-auth-query.ts` | Current user `{ id, email, user_metadata }` (via `getCurrentUser` action) |
| `useSession()` | `use-auth-query.ts` | `{ user }` while signed in (tokens are httpOnly, never in the browser) |
| `useProfile(userId)` | `use-auth-query.ts` | User profile (2min stale) |
| `useUpdateProfile()` | `use-auth-query.ts` | Profile update mutation (editable fields only) |
| `useWishlist()` / `useToggleWishlist()` | `use-wishlist.ts` | Wishlisted hotel ids, optimistic toggle |
| `useRazorpay()` | `useRazorpay.ts` | Loads Razorpay checkout script |
| `useRazorpayCheckout()` | `useRazorpayCheckout.ts` | `startPayment(...)`: create order → open Razorpay → verify; `stage` for button states |

### Zustand v5 (Client State) — Providerless

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useSearchStore` | `use-search-store.ts` | No | Search form: location, checkIn, checkOut, adults, children, rooms, boatDate, activeTab, isGuestOpen |
| `useBookingStore` | `use-booking-store.ts` | Yes (`ht-booking-guest`, v1) | Guest contact pre-fill (firstName, lastName, email, phone) |
| `useUIStore` | `use-ui-store.ts` | No | mobileMenuOpen toggle; login popup (`openAuth({ intent, redirectTo, notice })`, `closeAuth`); `authVersion` (bumped after sign-in so Navbar etc. re-read the user) |

**Key patterns:**
- `useShallow` from `zustand/react/shallow` for grouped selectors (prevents unnecessary re-renders)
- State/Actions type separation (e.g. `SearchStateData` + `SearchActions` = `SearchState`)
- `useBookingHydration()` hook — returns `true` only after `persist.onFinishHydration`, gates `useEffect` that syncs localStorage → component state
- `hydrateFromParams()` on `useSearchStore` — bridges URL search params into the store on results page mount
- Auth props (userName/userEmail) take priority over persisted store values

### State Boundaries

- **Server state** → TanStack Query (hotels, boats, user, profile)
- **Client state** → Zustand (search form, booking guest details, UI toggles)
- **Auth state** → httpOnly session cookie on the server; client components read it through server actions (`lib/actions/session.ts`). Browsers never talk to Firestore/Firebase Auth directly.
- **Filter state** → URL search params (source of truth on results pages)

## Server Actions (`lib/actions/`)

| File | Key Functions |
|------|--------------|
| `auth.ts` | `signIn`, `signUp`, `signInWithProvider` (Google/phone ID token), `completeProfile`, `signOut`, `resetPasswordRequest`, `updatePassword` |
| `bookings.ts` | `createBooking`, `getBookingByReference`, `getUserBookings`, `cancelBooking` |
| `admin.ts` | `getAdminStats`, `getAllBookings`, `getAllHotels`, `createHotel`, `updateHotel`, `deleteHotel`, CRUD for room types, amenities, images, payments |
| `blogs.ts` | `getAllBlogs` (via RPC `get_blogs_with_author`), `createBlog`, `updateBlog`, `deleteBlog`, `uploadBlogImage`, `getBlogStats` |
| `reviews.ts` | `submitReview` (converts 1-5 stars → 0-10 scale), `getReviewByBookingId` |
| `boat-admin.ts` | Parallel to `admin.ts` for boats: CRUD boats, trip types, time slots, amenities, images |
| `boat-bookings.ts` | `createBoatBooking`, `getBoatBookingByReference`, `cancelBoatBooking` |
| `boat-reviews.ts` | `submitBoatReview`, `getBoatReviewByBookingId` |
| `users.ts` | Admin user management (super_admin): list/create/update/delete admin users |
| `profile.ts` | `updateProfile`, `deleteAccount` |
| `session.ts` | `getCurrentUser`, `getProfile`, `updateProfileFields`, `getFilterAmenities` (for client components) |
| `uploads.ts` | `uploadUserImage(folder, formData)` — profile/review photos (validated, stored under the user's id) |
| `saved-stays.ts` | `getSavedStay`, `saveStay`, `removeSavedStay`, `getSavedStays` — rooms a signed-in guest picked but hasn't paid for (one per hotel) |

**Return pattern:** `{ success: boolean, error?: string, data?: T }`

## Services (`lib/services/`)

| File | Purpose |
|------|---------|
| `email.service.ts` | Resend API: `sendBookingConfirmation`, `sendBookingConfirmed` (paid hotel stay, invoice PDFs attached; HTML from `bookingConfirmedEmail`), `sendBookingCancellation`, `sendPaymentReceipt` (boats), `sendHotelOwnerBookingAlert`, `sendBookingStatusUpdate`, `sendEmailVerification`, `sendPasswordReset` (HTML templates with inline CSS) |
| `booking-notifications.service.ts` | `notifyBookingConfirmed(bookingId)`: once per payment (claim `booking-confirmed_<first booking id>` via `claimOnce`, `lib/db/claims.ts`; stamps `bookings.confirmation_sent_at`), sends guest email + invoices, guest WhatsApp (only if `whatsapp_opt_in`), hotel WhatsApp to `hotels.phone`, hotel email. Facts formatted once by `buildBookingSummary` (`lib/utils/booking-summary.ts`). Best effort per channel, one `notify` log line |
| `whatsapp.service.ts` | `sendWhatsAppTemplate('guestBooking' \| 'hotelBooking', e164, variables)`: Twilio Messages REST with a Content SID; returns sent/skipped/failed, never throws; skipped until the `TWILIO_*` env is set. Template texts and setup: `docs/WHATSAPP_TEMPLATES.md` |
| `booking.service.ts` | Hotel booking: calculate totals (tax, service charge), insert booking + guests, `assignRoom`, `processCheckout` |
| `boat-booking.service.ts` | Boat booking logic (parallel structure to hotel) |
| `hotel.service.ts` | Hotel search, retrieval, availability |
| `boat.service.ts` | `searchBoats`, `getBoatBySlug`, `checkAvailability`, `getAvailableSlots`, `getFeaturedBoats` |

## Payment Flow (Razorpay)

Config: `lib/razorpay/config.ts` — server-side instance + client-side key constant

Who may pay: the signed-in owner, or for a guest checkout the browser that made it (`findPayableBookings` in `lib/services/guest-checkout.service.ts`; create-order, verify and failed all use it).

1. **Create Order** (`POST /api/payment/create-order`) — amount from database (NEVER from client), creates Razorpay order (amount in paise), sets booking to `payment_status: 'processing'`
2. **Client Modal** — `lib/hooks/useRazorpayCheckout.ts` opens Razorpay Checkout. The hotel review forms call it right after creating the booking, so Proceed to payment is one click (`payment/PayButton` retries); `payment/RazorpayButton` wraps it for the boat form
3. **Verify** (`POST /api/payment/verify`) — HMAC SHA256 signature verification (`order_id|payment_id` + secret), amount cross-check via Razorpay API, idempotency check on `payment_gateway_payment_id` (also a unique key in the data layer), updates booking to `confirmed`/`paid`, creates payment record, then (after the response) `notifyBookingConfirmed` for hotels or the receipt email for boats
4. **Webhook** (`POST /api/payment/webhook`) — handles async events (payment.authorized, payment.failed), uses `RAZORPAY_WEBHOOK_SECRET`; also calls `notifyBookingConfirmed`, which sends only if verify hasn't
5. **Refund** (`POST /api/payment/refund`) — 48-hour free cancellation policy, calculates refund by hours until check-in/trip, creates `refund_transactions` record, sends cancellation email
   - `GET /api/payment/refund?bookingId=xxx&bookingType=hotel|boat` returns eligibility info

## Authentication & Authorization

### Auth Flow (`lib/actions/auth.ts`, `lib/firebase/auth/`)
- Email/password via Firebase Authentication. `signIn` checks the password with the Identity Toolkit REST API, then stores an httpOnly Firebase **session cookie** (`__session`, 14 days). Unconfirmed emails can't sign in.
- `signUp` creates the Firebase user, stores `first_name`, `last_name`, `full_name`, `phone` (required, E.164 via `lib/utils/phone.ts`) in `user_metadata`, and emails a confirmation link (Resend) to `/[locale]/auth/callback?mode=verifyEmail`, which verifies and signs the user in
- Password reset: `resetPasswordRequest` emails `/auth/callback?mode=resetPassword`, which stores the code in an httpOnly cookie and forwards to `/auth/reset-password`; `updatePassword` consumes it and revokes old sessions
- `signOut` clears the cookie and revokes all of the user's sessions
- `db.auth.getUser()` returns a Supabase-compatible user (`id`, `email`, `user_metadata`, `created_at`, `last_sign_in_at`, `email_confirmed_at`). Firebase Auth holds credentials; the `_auth_users` collection holds metadata (role, hotel_ids, names). Only server code writes it.
- Creating/updating a user upserts the `profiles` row (email, role, hotel_ids; new accounts also seed names, phone, profile_image)
- **Login UI** is one panel, `components/auth/AuthPanel.tsx`: mobile number first (flag + country code box, `PhoneNumberInput`), CONTINUE → 6-digit SMS code, then round Google / Email buttons; email login/sign-up steps live in `EmailAuthSteps.tsx`. It is shown in a popup (`AuthDialog`, mounted by `Navbar`, opened with `useUIStore().openAuth(...)` — Navbar Sign In/Register and the hotel page Reserve button use it) and on `/auth/login` + `/auth/signup` (`AuthPageCard`, for redirects like `?redirect=/admin`). Side slides come from `lib/config/auth-promos.ts` (`AuthPromo`).
- **Google + mobile OTP**: the browser SDK (`lib/firebase/client.ts`, in-memory persistence) runs `signInWithPopup` or `signInWithPhoneNumber` (invisible reCAPTCHA, `use-phone-auth.ts`), then `signInWithProvider(idToken)` verifies the token (only `google.com`/`phone`, signed in < 5 min ago), adopts the account via `upsertFederatedUser`, and sets the same session cookie. New users are created on the fly.
- If name or mobile is missing after that, `CompleteProfileForm` asks once and `completeProfile` fills only empty fields; email is asked alongside but optional (`optional: ['email']`), so guests can book with just a mobile number. An email typed there is a contact address in `_auth_users`/`profiles` only, never set on the Firebase account (so nobody can claim someone else's address).
- **Guest checkout**: booking needs no sign-in. Without a session the review page takes name + mobile number; the booking has no `user_id`, stores `guest_phone` in E.164 and `guest_access_hash` (SHA-256 of a random token in the httpOnly `ht_guest_booking` cookie, so only that browser can pay or see the success page), and the rooms go to `saved_stays` under `guest_phone`. A phone (SMS code) sign-in calls `claimGuestRecords`, which moves that number's guest bookings and saved rooms onto the account (they then show in My Bookings).
- Phone-only and email accounts with the same person stay separate accounts (no automatic linking). Redirect targets go through `safeRedirect` (same-site paths only).

### Admin Roles (`lib/utils/roles.ts`)

| Role | Access |
|------|--------|
| `super_admin` (or legacy `admin`) | All hotels/boats, all bookings, analytics, user management, blog |
| `hotel_admin` | Specific hotels only (stored in `user_metadata.hotel_ids[]`) |

Guards in `lib/utils/admin.ts`: `requireAdmin()`, `requireSuperAdmin()`, `requireHotelAccess(hotelId)`, `getAdminHotelAccess()` → returns `{ userId, role, hotelIds }` (null hotelIds = access all)

## Data Layer (`lib/db/`, Firestore)

Server code queries Firestore through a PostgREST-style builder that kept the Supabase call style, so business logic didn't change in the migration:

```ts
const db = await createClient()     // as the signed-in user; row policies apply
const admin = createAdminClient()   // service role; bypasses policies (server-only)
const { data, error } = await db.from('bookings').select('*, hotel:hotels(name)').eq('user_id', id).single()
```

- `schema.ts` defines column types (writes are cast like Postgres: numeric strings → numbers, dates → `YYYY-MM-DD`, timestamps → ISO), defaults, unique keys, foreign keys and nesting. **Add new columns/tables to `schema.ts`.**
- **Layout (`layout.ts`)**: the primary key is the document id; tables with a `parent` in `schema.ts` are subcollections named after the table, e.g. `hotels/{id}/room_types/{id}/room_type_images/{id}`, `hotels/{id}/hotel_images`, `hotels/{id}/reviews/{id}/review_responses`, `bookings/{id}/booking_meal_plans`, `boats/{id}/trip_types/{id}/trip_time_slots`. Top-level: hotels, bookings, payments, refund_transactions, profiles, wishlists, amenities, blogs, etc. Lookups without the parent id use collection-group queries (indexes in `firestore.indexes.json`, applied with `node --env-file=.env scripts/deploy-firestore-indexes.mjs` or `firebase deploy --only firestore:indexes`; without them the layer scans the group). A nested row can't move to another parent. NULL columns aren't stored.
- Supported: `select` with embedded relations (`alias:table!fk_or_column!inner(...)`, nested), `eq/neq/gt/gte/lt/lte/like/ilike/is/in/contains/not/or/filter/match`, `order` (incl. `referencedTable`), `limit/range`, `single/maybeSingle`, `count: 'exact'`/`head`, `insert/update/upsert/delete` with `.select()` returning, `rpc('get_blogs_with_author')`
- Postgres behaviors kept: column defaults, unique constraints (sentinel docs in `_unique`, error `23505`), `PGRST116` for `.single()`, ON DELETE CASCADE/SET NULL/RESTRICT (`23503`), atomic conditional updates (transactions), trigger replacements in `hooks.ts` (updated_at, booking num_nights/subtotal, profiles.full_name, payment audit log)
- `policies.ts` replaces RLS for `createClient()` queries. Firestore/Storage rules (`firestore.rules`, `storage.rules`) deny all direct client access; Storage image folders are public-read.
- Only equality filters go to Firestore (no composite indexes needed); other filters, sorting and paging run in memory. Fine at the current data volume (hundreds of rows); add pushdown + indexes if a collection grows large.

### Hotel Tables
`hotels`, `hotel_images`, `hotel_amenities`, `room_types`, `room_type_images`, `room_type_amenities`, `rooms`, `bookings`

### Boat Tables
`boats`, `boat_images`, `boat_amenities`, `trip_types`, `trip_type_images`, `trip_time_slots`, `boat_bookings`

### Common Tables
`amenities`, `amenity_categories`, `reviews`, `review_responses`, `boat_reviews`, `payments`, `refund_transactions`, `blogs`, `blog_images`, `profiles`, `saved_stays` (unpaid room picks: per `user_id` or guest `guest_phone`, per hotel; cleared when that hotel's booking is paid)

### Internal Collections
`_auth_users` (auth metadata per Firebase user), `_unique` (unique-key sentinels), `_counters` (invoice serial per financial year), `_invoice_numbers` / `_invoices` (create-only guards: a number is issued once, a booking numbered once), `_claims` (run-once claims from `claimOnce` in `lib/db/claims.ts`, e.g. one booking confirmation per payment)

### Invoices
- Every paid hotel booking gets `bookings.invoice_number` (`TRV/26-27/00001`: one consecutive series per Indian financial year, ≤ 16 chars) and `invoice_date`, from `assignInvoiceNumber` in `lib/db/invoice-numbers.ts` (one transaction: booking + counter + guards, retried on a lost race). Assigned in `api/payment/verify` and the webhook; bookings paid earlier get theirs on first download.
- `GET /api/bookings/[reference]/invoice` returns the tax invoice PDF (`lib/services/invoice-pdf.ts`, pdf-lib, built-in Helvetica: Latin text only, amounts in INR) for the owner, the hotel's admins, or the browser of a guest checkout, once `isInvoiceable` (paid, not cancelled). Lines/GST are rebuilt from the stored amounts by `invoiceBreakdown` (`lib/utils/invoice.ts`); CGST + SGST when the property is in the issuer's state, else IGST.
- Issuer details, prefix and SAC codes: `lib/config/invoice.ts`. Download buttons: `BookingsList` (My Bookings), `BookingConfirmation`, payment success page, admin booking page.

### Demo data
`npm run seed:demo` adds "Demo Stay Honnavar (Test Hotel)" (fixed ids, re-runnable); `npm run seed:demo -- --remove` deletes it. It is active and bookable — remove before going live.

### Key Types (`lib/types/index.ts`)
- Status enums: `BookingStatus` (pending, confirmed, checked_in, checked_out, cancelled), `HotelStatus`, `PaymentStatus`, `ReviewStatus`, `BoatStatus`, `BoatBookingStatus`
- `PropertyType`: hotel, apartment, resort, villa, guesthouse, hostel, motel
- `BoatType`: motorboat, sailboat, speedboat, houseboat, kayak, ferry
- `PricingModel`: per_person, per_boat
- Booking reference format: `BK-YYYYMMDD-XXXX` (collision-safe generation loop)

## Internationalization

- Config: `i18n/routing.ts` — locales: `['en', 'es', 'fr']`, default: `'en'`
- Messages: `messages/{en,es,fr}.json`
- Navigation: `import { Link, useRouter, usePathname } from '@/i18n/routing'`
- Translations: `useTranslations('Namespace')` from `next-intl`

## Image & Storage

### Firebase Storage Folders
`hotel-images`, `room-images`, `boat-images`, `trip-images`, `blog-images`, `review-images`, `profile-images` — top-level folders in the default bucket (the former Supabase buckets). `db.storage.from(folder)` keeps the Supabase-style `upload/getPublicUrl/remove` API. Public URL: `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<folder>%2F<path>?alt=media`

### Helpers (`lib/utils/storage.ts`)
- `uploadImage(file, bucket, path)` — validates type (JPEG/PNG/WebP) & size (max 5MB), returns `{ url, path }`
- `deleteImage(bucket, path)` — removes from storage
- `extractStoragePath(url, bucket)` — parses storage path from public URL
- Path format: `${entityId}/${Date.now()}-${random}.${ext}`
- `storage_path` column on image tables for easier deletion

### Next.js Image Config (`next.config.ts`)
Remote patterns: `images.unsplash.com`, `firebasestorage.googleapis.com/v0/b/**`, legacy `*.supabase.co/storage/v1/object/public/**` (remove after the storage migration)

## Page Layout

- Homepage (`app/[locale]/page.tsx`): `Hero` (`home/HeroSlideshow`: crossfading photos from `lib/config/hero-slides.ts` under a neutral scrim, no colour wash; `SearchWidget` card overlapping its bottom edge; its hotel tab is `search/HotelSearchBox`: destination, check-in/out with nights, guests picker, price per night → `minPrice`/`maxPrice`, stay-type chips → `propertyType`; dates default to tonight → tomorrow) → `home/TrustBar` → `FeaturedHotels` (full-photo `home/FeaturedStayCard`s, plus `ExploreStaysCard` filling a 2-of-3 last row) → `PackagesSection` → `FeaturedBlogs` → `home/ListPropertyCta` → `Footer`
- Hotel page (`hotel/HotelDetailsClient`): header highlights come from the hotel's own amenities (no hard-coded badges); hero = `hotel/ImageGallery` (grid adapts to the photo count, 1 photo on phones) beside `hotel/RoomAvailabilityCard` (full-photo room cards with price, capacity and availability; Select scrolls to `#room-{id}` in `RoomComparison`; phones swipe them); a phone bottom bar with price + Select rooms hides over the rooms list. Once rooms are added (`RoomComparison`, cart state owned by `HotelDetailsClient`), `hotel/BookingCartBar` is pinned to the bottom on every screen size (rooms, nightly total, Clear, checkout); signed in, the cart syncs to `saved_stays` and comes back on any device
- Booking review (`hotels/[slug]/book`, `booking/BookingForm` + `MultiRoomBookingForm`), MakeMyTrip-style: left = `booking/review/StaySummaryCard` (hotel photo/name/address, check-in → nights → check-out tiles that open date pickers, guests; room + guest selectors as children), guest details, meals, requests, cancellation notice; right (sticky) = `booking/review/PriceBreakupCard` (charge lines, folded taxes, total) with the pay step as children: errors, terms checkbox, Proceed to payment (`<Button form="booking-form">` submits the left form, creates the booking and opens Razorpay at once) → `PayButton` for retries. Mobile number first, email optional; open to guests without sign-in (guest checkout). Under the mobile field, `booking/review/WhatsAppOptIn` (ticked by default) sets `bookings.whatsapp_opt_in` for the WhatsApp confirmation. Optional GST details (`booking/review/GstDetailsFields`: GSTIN with check-digit validation, registered company name + address) are validated again on the server (`parseGstDetails` in `lib/utils.ts`), stored as `bookings.gst_number` / `gst_company_name` / `gst_company_address`, and shown on the admin booking page, the guest's booking page and the hotel-owner email. Don't repeat hotel/dates on the right
- Payment success (`payment/success/page.tsx` loads the booking and every booking paid in the same Razorpay order; `booking/BookingSuccess` renders it): minimal and centred, an animated check (pop, tick draw, ripple, dot burst; keyframes inline in the component, skipped for reduced motion) and staggered `motion-safe:animate-in` fade-ups, then one ticket card (hotel, dates, rooms, guests, booking ID, total paid), Download invoice / View booking, and the cancellation deadline. The price breakup is in the invoice PDF
- **Page width**: wrap page content in `page-container` (utility in `app/globals.css`): centred, content max 1200px like MakeMyTrip, side gutters 16px → 24px (sm) → 32px (lg) → 40px (xl). Don't use `container` (its width jumps per breakpoint). Account pages sit in `(account)/layout.tsx` (page-container + 248px sidebar), so they render only their content at the column's full width. The account menu (`account/account-links.ts`: Profile → My Bookings → Wishlist, icon + label only) feeds `AccountSidebar` and the navbar account menu. My Bookings = `SavedStaysList` + `booking/BookingsList` (Upcoming / Past / Cancelled tabs; view, invoice, cancel, review; cards switch layout by their own width with `@container`). The whole card is a link to the booking (an `absolute inset-0 z-[1]` Link; the card's buttons sit above it at `relative z-10`), with a large status pill from `statusOf()` (booking + payment status). The booking page (`BookingConfirmation`) puts `booking/MapPattern` (contours, grid, dashed route with a gold pin) over its status-coloured hero and shows check-in → nights → check-out as `DateHighlight` calendar tiles; amounts use `formatRupees` (paise shown, never rounded to ₹0).
- Section headings use `components/layout/SectionHeader` (gold eyebrow, Manrope title, optional description and right-aligned action) — reuse it for new sections
- Sections alternate ivory (`bg-background`) and white bands (`bg-card border-y border-border`); cards are white with a hairline `border-border` and a soft teal-tinted shadow on hover
- Navbar is 64px (72px from `sm`); fixed-header offsets use `pt-16 sm:pt-[72px]` and sticky bars `top-16 sm:top-[72px]`
- Marketing copy about cancellations must use `FREE_CANCELLATION_HOURS` and mention the gateway fee (refunds are not "free")

## Search Components Pattern

`search/HotelSearchBox` is the one hotel search: the homepage `SearchWidget` hotel tab and the `/hotels` header both use it; dates and guests live in `useSearchStore` (Zustand):
- Tiles: Destination → Check-in/out (with nights) → Rooms & Guests → Price per night, Search button, stay-type chips below
- `/hotels` renders `<HotelSearchBox compact keepFilters initial={params} />`: `compact` drops the price tile and chips (the sidebar `HotelFilters` cover them), `keepFilters` keeps star/amenity/sort params when searching again, `initial` pre-fills from the URL via `hydrateFromParams()` (price and stay type re-sync whenever the URL changes)
- Date range: `Calendar mode="range"`, two months from `md`, past dates disabled
- Results use `search/HotelCard`: a row card (photo / details / rating + price) when its container is ≥ 36rem (`@container`, `@xl:`), stacked when narrower (wishlist grid)
- Boat tab in SearchWidget uses separate `boatDate` (single date) state

## Review System

- **Hotel reviews** (`lib/actions/reviews.ts`): Converts 1-5 star input → 0-10 scale in DB. Categories: overall, staff, facilities, cleanliness, comfort, value, location, free_wifi
- **Boat reviews** (`lib/actions/boat-reviews.ts`): Categories: overall, safety, crew, experience, value
- One review per booking (enforced). User must own the booking. Booking must be completed + paid.
- Status: pending → approved (by admin)

## Blog System

- Tiptap editor with extensions: color, image, link, placeholder, text-align, text-style, underline
- Custom prose styles in `app/globals.css`
- Auto-generated slugs from title (with collision handling)
- Status: draft, published, archived. SEO: meta_title, meta_description. Tags as string array.
- `getAllBlogs` uses `rpc('get_blogs_with_author')` (`lib/db/rpc.ts`) to join with author email

## Conventions

- **Path alias**: `@/*` → project root
- **Currency**: INR formatted via `formatCurrency()` in `lib/utils.ts` (Intl.NumberFormat en-IN)
- **CSS**: Tailwind CSS 4 with `cn()` (clsx + tailwind-merge). Theme tokens in `app/globals.css` — use token classes, never hex values in components:
  - Brand Teal `#107F78` → `primary` (hover `#096861` → `hover:bg-primary-hover`), Deep Teal `#073F3D` → `secondary`, Champagne Gold `#D8AA68` → `gold`
  - Warm Ivory `#F8F6F0` → `background`, White → `card`, Soft Mint `#E8F3EF` → `mint` / `muted` / `accent` (shadcn hover surfaces), Border `#E2E9E5` → `border`
  - Dark Slate `#243A38` → `foreground`, Muted Gray `#647874` → `muted-foreground`
- **Fonts** (`lib/fonts.ts`, variables on `<html>`): Manrope 600/700/800 for headings, titles and hotel names (`h1`–`h6` automatically, or `font-heading`); Inter 400/500/600 for everything else (`font-sans`, the default)
- **UI Components**: shadcn/ui (New York style) in `components/ui/`
- **Forms**: React Hook Form + Zod schemas
- **Data fetching (server)**: `const db = await createClient()` (or `createAdminClient()`) from `lib/db/server.ts`
- **Data fetching (client)**: TanStack Query hooks hitting API routes or server actions — never Firestore directly
- **Revalidation**: `revalidatePath('/path')` after mutations
- **Server Actions body limit**: 3MB

## ESLint Rules

- `no-explicit-any`: off
- `no-unused-vars`: warn
- `no-unescaped-entities`: off
- `no-img-element`: warn

## Environment Variables

Required in `.env` (see `.env.example`):
```
NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_KEY          # service-account JSON on one line (or FIREBASE_PROJECT_ID/_CLIENT_EMAIL/_PRIVATE_KEY)
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM="Honnavar Travels <noreply@honnavartravels.com>"
TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN)   # optional: WhatsApp
TWILIO_WHATSAPP_FROM, TWILIO_WA_GUEST_BOOKING_SID, TWILIO_WA_HOTEL_BOOKING_SID      # see docs/WHATSAPP_TEMPLATES.md
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
```

Firebase console setup: enable the Email/Password sign-in provider, create the Firestore database and Storage bucket, and deploy `firestore.rules` / `storage.rules` (`firebase deploy --only firestore:rules,storage`).

## Hosting (Netlify)

- `netlify.toml` — build `npm run build`, Next.js runtime applied automatically
- Scheduled job: `netlify/functions/cancel-stale-bookings.mjs` calls `/api/cron/cancel-stale-bookings` every 15 min with `CRON_SECRET` (`vercel.json` holds the equivalent Vercel cron)
- Server code runs in AWS Lambda, which caps all environment variables at 4KB combined: prefer `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` over the full service-account JSON, and don't add the Supabase variables there

## Security Practices

- Payment amount always fetched from database, never trusted from client
- Razorpay HMAC SHA256 signature verification + amount cross-check via API
- Idempotency: checks `payment_gateway_payment_id` to prevent double processing
- Firestore and Storage closed to browsers (rules deny client access); row access for user-scoped queries enforced by `lib/db/policies.ts`
- Session cookies are httpOnly, verified with revocation checks; roles come from server-written `_auth_users.user_metadata`
- Server-side admin guards (`requireAdmin`, `requireHotelAccess`)
- Image upload validation (type, size, sanitized storage paths)
- Booking ownership verification (users can only access own bookings/reviews); guest checkouts are hidden from all row policies and reached only through the admin client after the browser's guest token is checked
- Booking creation counts availability and generates references with the admin client (row policies would hide other guests' bookings)
