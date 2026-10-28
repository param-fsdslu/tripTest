'use client'

/** Hotel page "360° View": the live viewer, with a switcher when there are several panoramas */
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { PanoramaViewer, panoramaViewerSrc } from '@/components/media/PanoramaViewer'
import type { HotelPanorama } from '@/lib/types/hotel'
import { cn } from '@/lib/utils'

interface PanoramaTourProps {
  hotelName: string
  panoramas: Pick<HotelPanorama, 'id' | 'image_url' | 'title' | 'display_order'>[]
}

export function PanoramaTour({ hotelName, panoramas }: PanoramaTourProps) {
  const sorted = [...panoramas].sort((a, b) => a.display_order - b.display_order)
  const [activeId, setActiveId] = useState(sorted[0]?.id)
  const active = sorted.find((p) => p.id === activeId) ?? sorted[0]
  if (!active) return null

  return (
    <Card>
      <CardContent className="px-5 sm:px-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold text-foreground">360° View</h2>
          <p className="text-xs text-muted-foreground">Drag to look around · pinch or use + / − to zoom</p>
        </div>

        <PanoramaViewer
          key={active.id}
          src={panoramaViewerSrc(active.image_url)}
          title={active.title}
          hotelName={hotelName}
        />

        {sorted.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="360° views">
            {sorted.map((panorama, i) => (
              <button
                key={panorama.id}
                type="button"
                role="tab"
                aria-selected={panorama.id === active.id}
                onClick={() => setActiveId(panorama.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  panorama.id === active.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {panorama.title || `View ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
