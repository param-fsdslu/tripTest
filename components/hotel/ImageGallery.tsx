'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Grid3x3, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HotelImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

interface ImageGalleryProps {
  images: HotelImage[];
  hotelName: string;
  /** Extra classes for the photo grid (e.g. to stretch it beside the availability card) */
  className?: string;
}

export function ImageGallery({ images, hotelName, className }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const mainImage = sortedImages[0];
  const sideImages = sortedImages.slice(1, 5);

  // Grid by photo count so there are never empty cells: 1 → full width, 2 → halves,
  // 3 → large + two stacked, 4 → large + three (last one wide), 5+ → large + 2×2.
  // Phones show only the large photo (the rest open in the viewer).
  const count = sortedImages.length;
  const gridLayout =
    count <= 1 ? '' : count === 2 ? 'md:grid-cols-2' : count === 3 ? 'md:grid-cols-3 md:grid-rows-2' : 'md:grid-cols-4 md:grid-rows-2';
  const mainSpan = count >= 3 ? 'md:col-span-2 md:row-span-2' : '';

  const handlePrevious = () => {
    setImageLoading(true);
    setIsZoomed(false);
    setSelectedIndex((prev) =>
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setImageLoading(true);
    setIsZoomed(false);
    setSelectedIndex((prev) =>
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    if (index !== selectedIndex) {
      setImageLoading(true);
      setIsZoomed(false);
    }
    setSelectedIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isGalleryOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setIsGalleryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, selectedIndex]);

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={cn(
          'relative grid grid-cols-1 gap-2 h-[260px] sm:h-[340px] md:h-[400px] lg:h-[450px] rounded-xl overflow-hidden',
          gridLayout,
          className
        )}
      >
        {/* Main image */}
        <div
          className={`relative cursor-pointer group overflow-hidden ${mainSpan}`}
          onClick={() => {
            setSelectedIndex(0);
            setIsGalleryOpen(true);
          }}
        >
          {mainImage ? (
            <>
              <Image
                src={mainImage.image_url}
                alt={mainImage.alt_text || hotelName}
                fill
                sizes={count === 1 ? '100vw' : '(min-width: 768px) 60vw, 100vw'}
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full bg-border flex items-center justify-center">
              <span className="text-muted-foreground">No image available</span>
            </div>
          )}
        </div>

        {/* Side images */}
        {sideImages.map((image, index) => (
          <div
            key={image.id}
            className={`relative hidden md:block cursor-pointer group overflow-hidden ${
              count === 4 && index === 2 ? 'md:col-span-2' : ''
            }`}
            onClick={() => {
              setSelectedIndex(index + 1);
              setIsGalleryOpen(true);
            }}
          >
            <Image
              src={image.image_url}
              alt={image.alt_text || `${hotelName} - Image ${index + 2}`}
              fill
              sizes="(min-width: 768px) 30vw, 1px"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Overlay on last image with photo count */}
            {index === sideImages.length - 1 && sortedImages.length > 5 && (
              <div
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(0);
                  setIsGalleryOpen(true);
                }}
              >
                <div className="text-center text-white">
                  <Grid3x3 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">+{sortedImages.length - 5} more</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Show All Photos Button - Bottom Left */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-4 gap-2 bg-white text-foreground hover:bg-white/90 shadow-lg"
          onClick={() => {
            setSelectedIndex(0);
            setIsGalleryOpen(true);
          }}
        >
          <Grid3x3 className="w-4 h-4" />
          View all {sortedImages.length} photos
        </Button>
      </div>

      {/* Fullscreen Gallery Dialog */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-full w-screen h-screen p-0 border-0 rounded-none">
          <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Image Counter & Title */}
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                    {selectedIndex + 1} / {sortedImages.length}
                  </div>
                  {sortedImages[selectedIndex]?.alt_text && (
                    <p className="text-white/90 text-sm font-medium hidden md:block">
                      {sortedImages[selectedIndex].alt_text}
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
                    onClick={() => setIsZoomed(!isZoomed)}
                    title={isZoomed ? 'Zoom out' : 'Zoom in'}
                  >
                    {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
                    onClick={() => setIsGalleryOpen(false)}
                    title="Close (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Image Container */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-16 py-20">
              <div className="relative w-full h-full max-w-6xl">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {sortedImages[selectedIndex] && (
                  <div className={`relative w-full h-full transition-transform duration-300 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                    onClick={() => setIsZoomed(!isZoomed)}
                  >
                    <Image
                      src={sortedImages[selectedIndex].image_url}
                      alt={sortedImages[selectedIndex].alt_text || `${hotelName} - Image ${selectedIndex + 1}`}
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

            {/* Navigation Buttons */}
            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm w-14 h-14 rounded-full border border-white/20 shadow-xl transition-all hover:scale-110"
                  onClick={handlePrevious}
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm w-14 h-14 rounded-full border border-white/20 shadow-xl transition-all hover:scale-110"
                  onClick={handleNext}
                  title="Next (→)"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Thumbnail Strip */}
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm p-4 md:p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50">
                  {sortedImages.map((image, index) => (
                    <button
                      key={image.id}
                      className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden transition-all duration-300 ${
                        index === selectedIndex
                          ? 'ring-4 ring-white shadow-2xl scale-110'
                          : 'ring-2 ring-white/20 hover:ring-white/50 hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      onClick={() => handleThumbnailClick(index)}
                    >
                      <Image
                        src={image.image_url}
                        alt={image.alt_text || `Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {index === selectedIndex && (
                        <div className="absolute inset-0 bg-white/20" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyboard Hints (visible on desktop) */}
            <div className="hidden md:block absolute bottom-32 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center">
              <p>Use ← → arrow keys to navigate • ESC to close • Click image to zoom</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
