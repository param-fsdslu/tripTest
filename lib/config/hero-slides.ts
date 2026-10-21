/**
 * Photos for the homepage hero slideshow, shown in this order. Images must be local (/public)
 * or from a host allowed in next.config.ts. Use wide landscape shots (at least 1920px wide).
 */
export interface HeroSlide {
  image: string
  alt: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: '/images/hero-background.png',
    alt: 'Coastline of Honnavar, Karnataka',
  },
  {
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80',
    alt: 'Sunrise over a quiet sandy beach',
  },
  {
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=2400&q=80',
    alt: 'Houseboat on palm-lined backwaters',
  },
  {
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2400&q=80',
    alt: 'Resort pool among palm trees and hills',
  },
]
