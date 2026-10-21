import { SearchWidget } from "@/components/search/SearchWidget";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";

/* ─────────────────────────────────────────────────────────────────
   Hero — full-bleed crossfading photo slideshow (photos in
   lib/config/hero-slides.ts), headline on the left, and the search
   card overlapping the bottom edge of the image.
   Typography:  Manrope (headline) + Inter (copy)
   ───────────────────────────────────────────────────────────────── */

export function Hero() {
  return (
    <section className="relative w-full bg-background">
      <HeroSlideshow
        className="h-[520px] sm:h-[580px] lg:h-[640px]"
        dotsClassName="page-container inset-x-0 bottom-28 sm:bottom-24 justify-end"
      >
        <div className="page-container h-full flex flex-col justify-center pb-20 sm:pb-16">
          <div
            className="max-w-2xl [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
            style={{ animation: "ht-hero-enter 0.6s ease-out both" }}
          >
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <span className="h-px w-8 bg-gold" />
              Coastal Karnataka
            </p>
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4rem] font-extrabold leading-[1.05] tracking-tight text-white">
              Unlock True Native Experiences
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-white/90">
              Handpicked stays, local experiences and secure booking along the Honnavar coast.
            </p>
          </div>
        </div>
      </HeroSlideshow>

      {/* Search card overlapping the image edge */}
      <div className="relative z-20 page-container -mt-24 sm:-mt-20">
        <SearchWidget />
      </div>
    </section>
  );
}
