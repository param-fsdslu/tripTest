'use client';

import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ExploreStaysCard, FeaturedStayCard, type FeaturedStay } from '@/components/home/FeaturedStayCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedHotels } from '@/lib/hooks/use-hotels';

/**
 * Homepage grid of active hotels (best location rating first) as full-photo cards.
 * Hidden when there are none. When the last desktop row would have one empty slot,
 * an "explore all stays" card fills it.
 */
export function FeaturedHotels() {
  const { data: hotels, isLoading, error } = useFeaturedHotels(6);

  if (error || (!isLoading && (!hotels || hotels.length === 0))) return null;

  const fillLastRow = !!hotels && hotels.length % 3 === 2;

  return (
    <section className="py-12 sm:py-16">
      <div className="page-container">
        <SectionHeader
          eyebrow="Where to stay"
          title="Featured stays"
          description="Hotels and homestays on the Honnavar coast, with prices that include taxes and fees."
          action={
            <Link
              href="/hotels"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              View all stays
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))
            : hotels!.map((hotel: FeaturedStay) => <FeaturedStayCard key={hotel.id} hotel={hotel} />)}
          {fillLastRow && <ExploreStaysCard className="hidden lg:flex" />}
        </div>
      </div>
    </section>
  );
}
