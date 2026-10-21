'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Open when parent signals an initialIndex
  useEffect(() => {
    if (initialIndex >= 0) {
      setActiveIndex(initialIndex);
      setIsZoomed(false);
      setImageLoading(true);
      setIsOpen(true);
    }
  }, [initialIndex]);

  const close = () => {
    setIsOpen(false);
    setIsZoomed(false);
    onClose?.();
  };

  const prev = () => {
    setImageLoading(true);
    setIsZoomed(false);
    setActiveIndex((i) => (i === 0 ? sorted.length - 1 : i - 1));
  };

  const next = () => {
    setImageLoading(true);
    setIsZoomed(false);
    setActiveIndex((i) => (i === sorted.length - 1 ? 0 : i + 1));
  };

  const openAt = (index: number) => {
    setActiveIndex(index);
    setIsZoomed(false);
    setImageLoading(true);
    setIsOpen(true);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex]);

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

      {/* Lightbox dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="max-w-full w-screen h-screen p-0 border-0 rounded-none">
          <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                    {activeIndex + 1} / {sorted.length}
                  </div>
                  <p className="text-white/80 text-sm font-medium hidden md:block">{roomName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
                    onClick={() => setIsZoomed((z) => !z)}
                    title={isZoomed ? 'Zoom out' : 'Zoom in'}
                  >
                    {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
                    onClick={close}
                    title="Close (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-16 py-20">
              <div className="relative w-full h-full max-w-6xl">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {sorted[activeIndex] && (
                  <div
                    className={`relative w-full h-full transition-transform duration-300 ${
                      isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    onClick={() => setIsZoomed((z) => !z)}
                  >
                    <Image
                      src={sorted[activeIndex].image_url}
                      alt={sorted[activeIndex].alt_text || `${roomName} - ${activeIndex + 1}`}
                      fill
                      className={`object-contain transition-opacity duration-300 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => setImageLoading(false)}
                      priority
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Prev / Next */}
            {sorted.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm w-14 h-14 rounded-full border border-white/20 shadow-xl transition-all hover:scale-110"
                  onClick={prev}
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm w-14 h-14 rounded-full border border-white/20 shadow-xl transition-all hover:scale-110"
                  onClick={next}
                  title="Next (→)"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Thumbnail strip */}
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm p-4 md:p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                  {sorted.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => { setImageLoading(true); setIsZoomed(false); setActiveIndex(idx); }}
                      className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                        idx === activeIndex
                          ? 'ring-4 ring-white shadow-2xl scale-110'
                          : 'ring-2 ring-white/20 hover:ring-white/50 hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img.image_url}
                        alt={img.alt_text || `Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="hidden md:block absolute bottom-28 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center">
              Use ← → arrow keys to navigate · ESC to close · Click image to zoom
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
