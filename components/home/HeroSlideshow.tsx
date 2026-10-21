'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { HERO_SLIDES } from '@/lib/config/hero-slides'

const SLIDE_MS = 6500
const FADE_MS = 1400

interface HeroSlideshowProps {
  /** Hero copy, layered above the photos */
  children: ReactNode
  /** Sizing for the slideshow box (height etc.) */
  className?: string
  /** Positioning for the slide indicators */
  dotsClassName?: string
}

/** Full-bleed crossfading photos with a slow zoom, a neutral scrim for legibility, and slide indicators */
export function HeroSlideshow({ children, className, dotsClassName }: HeroSlideshowProps) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const count = HERO_SLIDES.length

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Restarts on every change, so a slide picked by hand gets a full turn
  useEffect(() => {
    if (reduceMotion || count < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, reduceMotion, count])

  return (
    <div className={cn('relative overflow-clip bg-secondary', className)}>
      {HERO_SLIDES.map((slide, i) => {
        const active = i === index
        return (
          <div
            key={slide.image}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{
              opacity: active ? 1 : 0,
              transform: active && !reduceMotion ? 'scale(1.08)' : 'scale(1)',
              // Zoom in while showing; reset only once the slide has faded out
              transition: active
                ? `opacity ${FADE_MS}ms ease-in-out, transform ${SLIDE_MS + FADE_MS}ms ease-out`
                : `opacity ${FADE_MS}ms ease-in-out, transform 0ms linear ${FADE_MS}ms`,
            }}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
            />
          </div>
        )
      })}

      {/* Neutral scrim: keeps white copy readable on bright photos, darker at the top for the navbar */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />

      <div className="relative z-10 h-full">{children}</div>

      {count > 1 && (
        <div className={cn('absolute z-10 flex items-center gap-2', dotsClassName)}>
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index}
              className="group flex h-6 items-center"
            >
              <span
                className={cn(
                  'block h-[3px] rounded-full transition-all duration-500',
                  i === index ? 'w-9 bg-white' : 'w-4 bg-white/45 group-hover:bg-white/75'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
