'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Users, Camera, Map, Mountain } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { PackageEnquiryDialog } from './PackageEnquiryDialog'

const packages = [
  {
    title: 'Group Travel',
    description: 'Planning a group trip? Let us handle the logistics for your team or family.',
    icon: Users,
    image: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Wedding Photo Shoot',
    description: "Capture your special moments in scenic coastal beauty.",
    icon: Camera,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Tourism Package',
    description: "Explore beaches, temples, waterfalls, and hidden gems.",
    icon: Map,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Adventure Sports',
    description: 'Kayaking, trekking, and water sports experiences for thrill seekers.',
    icon: Mountain,
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
  },
]

export function PackagesSection() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

  return (
    <section className="py-12 sm:py-16 bg-card border-y border-border">
      <div className="page-container">
        <SectionHeader
          eyebrow="Plan with us"
          title="Experiences & packages"
          description="Tell us what you need and we'll get back to you on WhatsApp."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {packages.map((pkg) => {
            const Icon = pkg.icon
            return (
              <button
                key={pkg.title}
                type="button"
                onClick={() => setSelectedPackage(pkg.title)}
                className="group relative h-80 rounded-2xl overflow-hidden text-left
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Image
                  src={pkg.image}
                  alt={pkg.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent" />

                <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-primary shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-lg font-bold">{pkg.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/80 line-clamp-2">{pkg.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
                    Enquire now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Enquiry Dialog */}
      <PackageEnquiryDialog
        packageName={selectedPackage || ''}
        open={!!selectedPackage}
        onOpenChange={(open) => {
          if (!open) setSelectedPackage(null)
        }}
      />
    </section>
  )
}
