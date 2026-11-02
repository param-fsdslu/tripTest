'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Images, ZoomIn } from '@/components/icons';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';

interface RoomImage {
  id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface RoomImageGalleryProps {
  images: RoomImage[];
  roomName: string;
  /** Index to open the lightbox at. Controlled externally so the room card
   *  primary image click can open at index 0 while the thumbnail strip
   *  opens at the clicked index. Pass -1 (default) to keep closed. */
  initialIndex?: number;
  /** Called when the lightbox closes, so the parent can reset the index. */
  onClose?: () => void;
  /** Whether to show the thumbnail strip inline (expanded panel). */
  showThumbnails?: boolean;
}

export function RoomImageGallery({
  images,
  roomName,
  initialIndex = -1,
  onClose,
  showThumbnails = true,
}: RoomImageGalleryProps) {
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Open when parent signals an initialIndex
  useEffect(() => {
    if (initialIndex >= 0) {
      setActiveIndex(initialIndex);
      setIsOpen(true);
    }
  }, [initialIndex]);

  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  const openAt = (index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  if (sorted.length === 0) return null;

  return (
    <>
      {/* Inline thumbnail strip */}
      {showThumbnails && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Images className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold text-foreground text-sm">Room Photos</h4>
            <span className="text-xs text-muted-foreground">({sorted.length})</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sorted.slice(0, 7).map((img, idx) => (
              <div
                key={img.id}
                className="relative h-24 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openAt(idx)}
              >
                <Image
                  src={img.image_url}
                  alt={img.alt_text || `${roomName} photo ${idx + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                {/* "More" overlay on the last visible thumbnail */}
                {idx === 6 && sorted.length > 7 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">+{sorted.length - 7} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen viewer */}
      <PhotoLightbox
        photos={sorted.map((img, i) => ({
          id: img.id,
          src: img.image_url,
          alt: img.alt_text || `${roomName} - photo ${i + 1}`,
          caption: img.alt_text,
        }))}
        open={isOpen}
        onOpenChange={(open) => { if (!open) close(); }}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        title={roomName}
      />
    </>
  );
}
