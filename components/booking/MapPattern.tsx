/**
 * MapPattern — decorative "travel map" layer for coloured banners (booking details hero): faint
 * topographic contour rings, a map grid, and a dashed route between two pins. Absolutely
 * positioned, so put it first inside a `relative overflow-hidden` container; it scales to cover.
 * Lines use the parent's text colour (white on dark banners); the route and pin are gold.
 */
import { useId } from 'react'
import { cn } from '@/lib/utils'

/** One irregular closed contour around (cx, cy): an ellipse wobbled by a few sine terms */
function contour(cx: number, cy: number, r: number, seed: number) {
  const points: string[] = []
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2
    const rr = r * (1 + 0.1 * Math.sin(3 * t + seed) + 0.06 * Math.sin(5 * t + seed * 1.7) + 0.04 * Math.sin(7 * t + seed * 2.3))
    points.push(`${(cx + rr * Math.cos(t) * 1.3).toFixed(1)},${(cy + rr * Math.sin(t) * 0.8).toFixed(1)}`)
  }
  return `M${points.join('L')}Z`
}

/** Two "hills" of contour rings: bottom-left and top-right of an 800×320 canvas */
const CONTOURS = [
  ...Array.from({ length: 7 }, (_, i) => contour(110, 300, 28 + i * 30, 1.3)),
  ...Array.from({ length: 6 }, (_, i) => contour(720, 20, 24 + i * 30, 4.1)),
]

export function MapPattern({ className }: { className?: string }) {
  const gridId = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full text-white', className)}
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" stroke="currentColor" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* Map grid */}
      <rect width="800" height="320" fill={`url(#${gridId})`} opacity="0.06" />

      {/* Contour lines */}
      <g stroke="currentColor" strokeWidth="1.1" opacity="0.13">
        {CONTOURS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Dashed route between two pins */}
      <g className="text-gold">
        {/* Kept low and to the sides so it never runs behind the banner's centred text */}
        <path
          d="M70 272C190 304 320 296 450 280S650 236 700 118"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 9"
          opacity="0.7"
        />
        <circle cx="70" cy="272" r="6" fill="currentColor" opacity="0.35" />
        <circle cx="70" cy="272" r="3" fill="currentColor" />
        {/* Destination pin */}
        <path
          d="M700 118c-9 0-15-7-15-15 0-9 7-15 15-15s15 6 15 15c0 8-6 15-15 15z"
          transform="translate(0 -14)"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M700 118l-11-20h22z" fill="currentColor" opacity="0.9" />
        <circle cx="700" cy="89" r="5" fill="white" opacity="0.85" />
      </g>
    </svg>
  )
}
