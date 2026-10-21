'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  Bed,
  Maximize2,
  Check,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ShoppingCart,
  Minus,
  Plus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getInclusivePrice } from '@/lib/utils';
import { RoomImageGallery } from './RoomImageGallery';
import { getAmenityIcon } from '@/lib/utils/amenityIcons';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  size_sqm?: number;
  max_occupancy: number;
  max_adults: number;
  max_children: number;
  bed_configuration?: string;
  base_price: number;
  /** Effective per-night price for the selected stay dates (weekend/festival pricing applied), when dates are known. */
  current_price?: number;
  num_available_rooms: number;
  status: string;
  room_type_amenities?: Array<{
    id: string;
    amenity?: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  room_amenities?: Array<{
    id: string;
    amenity?: {
      id: string;
      name: string;
      icon?: string;
    };
  }>;
  room_type_images?: Array<{
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }>;
}

interface RoomCartSelection {
  roomId: string;
  qty: number;
}

/** Effective per-night price — reflects weekend/festival pricing for the selected stay when dates are known. */
function getDisplayPrice(room: RoomType): number {
  return room.current_price ?? room.base_price;
}

interface RoomComparisonProps {
  rooms: RoomType[];
  /** Rooms added to the booking (roomId → qty); owned by the page, which pins BookingCartBar */
  cart: Map<string, number>;
  setCart: Dispatch<SetStateAction<Map<string, number>>>;
  onBookRooms: (selections: RoomCartSelection[]) => void;
}

export function RoomComparison({ rooms, cart, setCart, onBookRooms }: RoomComparisonProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{ roomId: string; index: number } | null>(null);

  const sortedRooms = [...rooms].sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));

  const toggleExpand = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const toggleCompare = (roomId: string) => {
    const newSelected = new Set(selectedForCompare);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      if (newSelected.size < 3) {
        newSelected.add(roomId);
      }
    }
    setSelectedForCompare(newSelected);
  };

  // Cart helpers
  const addToCart = (roomId: string) => {
    setCart((prev) => new Map(prev).set(roomId, 1));
  };

  const removeFromCart = (roomId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(roomId);
      return next;
    });
  };

  const updateQty = (roomId: string, delta: number, maxQty: number) => {
    const current = cart.get(roomId) ?? 1;
    const next = current + delta;
    if (next <= 0) {
      removeFromCart(roomId);
    } else {
      setCart((prev) => new Map(prev).set(roomId, Math.min(next, maxQty)));
    }
  };

  const handleBookNow = () => {
    if (cart.size === 0) return;
    const selections = Array.from(cart.entries()).map(([roomId, qty]) => ({ roomId, qty }));
    onBookRooms(selections);
  };

  const roomsToDisplay = compareMode
    ? sortedRooms.filter((room) => selectedForCompare.has(room.id))
    : sortedRooms;

  const selectedRooms = sortedRooms.filter((room) => selectedForCompare.has(room.id));

  const allAmenities = new Set<string>();
  selectedRooms.forEach((room) => {
    (room.room_type_amenities || room.room_amenities || []).forEach((amenity: any) => {
      if (amenity.amenity?.name) {
        allAmenities.add(amenity.amenity.name);
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Header with Compare Toggle */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-xl font-bold text-foreground">Available Rooms & Prices</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Add one or more room types to your booking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2 py-1">
            {rooms.length} room {rooms.length === 1 ? 'type' : 'types'}
          </Badge>
          {selectedForCompare.size > 0 && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCompareDialog(true)}
                className="gap-1.5"
              >
                Compare {selectedForCompare.size}
              </Button>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                className="gap-1.5"
              >
                {compareMode ? 'Show All' : 'Filter View'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Compare Mode Info */}
      {!compareMode && selectedForCompare.size > 0 && (
        <div className="bg-mint border border-border rounded-lg p-3 text-xs text-secondary">
          <p className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>{selectedForCompare.size} room{selectedForCompare.size > 1 ? 's' : ''} selected.</strong>{' '}
              Click "Compare {selectedForCompare.size}" to view side-by-side or select up to {3 - selectedForCompare.size} more.
            </span>
          </p>
        </div>
      )}

      {/* Price Range Overview */}
      <Card className="bg-linear-to-r from-mint to-background border-border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Starting from</p>
              <p className="text-2xl font-bold text-primary">
                ₹{getInclusivePrice(Math.min(...rooms.map(getDisplayPrice))).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-muted-foreground">per night, incl. taxes</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Average</p>
              <p className="text-xl font-semibold text-foreground">
                ₹{getInclusivePrice(Math.round(
                  rooms.reduce((sum, r) => sum + getDisplayPrice(r), 0) / rooms.length
                )).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-muted-foreground">per night, incl. taxes</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-1">Up to</p>
              <p className="text-xl font-semibold text-foreground">
                ₹{getInclusivePrice(Math.max(...rooms.map(getDisplayPrice))).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-muted-foreground">per night, incl. taxes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Cards */}
      <div className="space-y-4">
        {roomsToDisplay.map((room) => {
          const isExpanded = expandedRooms.has(room.id);
          const isSelectedForCompare = selectedForCompare.has(room.id);
          const isCheapest = getDisplayPrice(room) === Math.min(...rooms.map(getDisplayPrice));
          const primaryImage = room.room_type_images?.[0];
          const roomImages = room.room_type_images ?? [];
          const isLightboxOpen = lightbox?.roomId === room.id;
          const inCart = cart.has(room.id);
          const cartQty = cart.get(room.id) ?? 1;
          const isUnavailable = room.status !== 'available' || room.num_available_rooms === 0;

          return (
            <Card
              key={room.id}
              id={`room-${room.id}`}
              className={`overflow-hidden transition-all duration-300 ${
                inCart ? 'ring-2 ring-primary' : ''
              } ${isCheapest && !inCart ? 'border-primary border-2' : ''}`}
            >
              <div className="relative">
                {/* Best Value Badge */}
                {isCheapest && (
                  <Badge className="absolute top-3 left-3 z-10 bg-gold text-secondary hover:bg-gold">
                    Best Value
                  </Badge>
                )}

                {/* Compare Checkbox with Tooltip */}
                <div className="absolute top-3 right-3 z-10">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isSelectedForCompare ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => toggleCompare(room.id)}
                          disabled={!isSelectedForCompare && selectedForCompare.size >= 3}
                        >
                          {isSelectedForCompare ? (
                            <><Check className="w-3 h-3 mr-1" /> Selected</>
                          ) : (
                            'Compare'
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {isSelectedForCompare
                            ? 'Click to remove from comparison'
                            : selectedForCompare.size >= 3
                            ? 'Maximum 3 rooms can be compared'
                            : 'Click to add to comparison (up to 3 rooms)'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3">
                  {/* Room Image */}
                  <div
                    className="relative h-48 md:h-full rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => roomImages.length > 0 && setLightbox({ roomId: room.id, index: 0 })}
                  >
                    {primaryImage ? (
                      <>
                        <Image
                          src={primaryImage.image_url}
                          alt={primaryImage.alt_text || room.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ZoomIn className="w-5 h-5 text-foreground" />
                          </div>
                        </div>
                        {roomImages.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                            1 / {roomImages.length}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full bg-border flex items-center justify-center">
                        <Bed className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {room.num_available_rooms <= 3 && (
                      <Badge variant="destructive" className="absolute bottom-2 left-2">
                        Only {room.num_available_rooms} left!
                      </Badge>
                    )}
                  </div>

                  {/* Room Details */}
                  <div className="md:col-span-2 min-w-0 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{room.name}</h3>
                      {room.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>
                          Up to {room.max_occupancy} guests ({room.max_adults} adults,{' '}
                          {room.max_children} children)
                        </span>
                      </div>
                      {room.bed_configuration && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Bed className="w-4 h-4" />
                          <span>{room.bed_configuration}</span>
                        </div>
                      )}
                      {room.size_sqm && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Maximize2 className="w-4 h-4" />
                          <span>{room.size_sqm} m²</span>
                        </div>
                      )}
                    </div>

                    {((room.room_type_amenities && room.room_type_amenities.length > 0) ||
                      (room.room_amenities && room.room_amenities.length > 0)) && (
                      <div className="flex flex-wrap gap-2">
                        {(room.room_type_amenities || room.room_amenities || [])
                          .slice(0, 4)
                          .map((amenity: any) => {
                            const name = amenity.amenity?.name || 'Amenity';
                            const Icon = getAmenityIcon(name);
                            return (
                              <Badge key={amenity.id} variant="outline" className="text-xs gap-1">
                                <Icon className="w-3 h-3" />
                                {name}
                              </Badge>
                            );
                          })}
                        {(room.room_type_amenities || room.room_amenities || []).length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(room.room_type_amenities || room.room_amenities || []).length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Price and Cart Actions */}
                    <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-primary">
                            ₹{getInclusivePrice(getDisplayPrice(room)).toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm text-muted-foreground">/ night</span>
                          {room.current_price != null && room.current_price !== room.base_price && (
                            <Badge variant="outline" className="text-[10px]">For selected dates</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">incl. taxes & fees</p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(room.id)}
                          className="gap-1"
                        >
                          {isExpanded ? (
                            <>Less <ChevronUp className="w-4 h-4" /></>
                          ) : (
                            <>More details <ChevronDown className="w-4 h-4" /></>
                          )}
                        </Button>

                        {inCart ? (
                          <div className="flex items-center gap-2">
                            {/* Quantity stepper */}
                            <div className="flex items-center border rounded-md overflow-hidden">
                              <button
                                className="px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                onClick={() => updateQty(room.id, -1, room.num_available_rooms)}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-sm font-medium min-w-8 text-center">
                                {cartQty}
                              </span>
                              <button
                                className="px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                onClick={() => updateQty(room.id, 1, room.num_available_rooms)}
                                disabled={cartQty >= room.num_available_rooms}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(room.id)}
                              className="text-destructive border-destructive/30 hover:bg-destructive/5"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addToCart(room.id)}
                            disabled={isUnavailable}
                            className="px-6 gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Booking
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t bg-background">
                    <div className="pt-4">
                      <h4 className="font-semibold text-foreground mb-3">All Amenities</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(room.room_type_amenities || room.room_amenities || []).map((amenity: any) => {
                          const name = amenity.amenity?.name || 'Amenity';
                          const Icon = getAmenityIcon(name);
                          return (
                            <div key={amenity.id} className="flex items-center gap-2 text-sm">
                              <Icon className="w-4 h-4 text-primary shrink-0" />
                              <span>{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {roomImages.length > 0 && (
                      <RoomImageGallery
                        images={roomImages}
                        roomName={room.name}
                        initialIndex={isLightboxOpen ? lightbox!.index : -1}
                        onClose={() => setLightbox(null)}
                        showThumbnails={true}
                      />
                    )}
                  </div>
                )}

                {roomImages.length > 0 && !isExpanded && isLightboxOpen && (
                  <RoomImageGallery
                    images={roomImages}
                    roomName={room.name}
                    initialIndex={lightbox!.index}
                    onClose={() => setLightbox(null)}
                    showThumbnails={false}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {compareMode && selectedForCompare.size === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No rooms selected for comparison</p>
          <Button variant="outline" className="mt-4" onClick={() => setCompareMode(false)}>
            Back to all rooms
          </Button>
        </div>
      )}

      {/* Comparison Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="w-[95vw]! max-w-[1600px]! h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">Compare Rooms</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of {selectedRooms.length} selected room
              {selectedRooms.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 pb-6">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-white">
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 bg-background font-bold sticky left-0 z-30 min-w-[140px] border-r-2 border-border">
                    Feature
                  </th>
                  {selectedRooms.map((room) => (
                    <th key={room.id} className="p-3 bg-background min-w-[280px] align-top">
                      <div className="space-y-2">
                        <div className="font-bold text-base text-foreground line-clamp-2">{room.name}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCompare(room.id)}
                          className="text-xs h-7"
                        >
                          <X className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Images */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Room Image</td>
                  {selectedRooms.map((room) => {
                    const roomImages = room.room_type_images ?? [];
                    const isLightboxOpen = lightbox?.roomId === room.id;
                    return (
                      <td key={room.id} className="p-3">
                        <div
                          className="relative h-48 rounded-lg overflow-hidden cursor-pointer group"
                          onClick={() => roomImages.length > 0 && setLightbox({ roomId: room.id, index: 0 })}
                        >
                          {room.room_type_images?.[0] ? (
                            <>
                              <Image
                                src={room.room_type_images[0].image_url}
                                alt={room.room_type_images[0].alt_text || room.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                                <div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <ZoomIn className="w-5 h-5 text-foreground" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full bg-border flex items-center justify-center">
                              <Bed className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {roomImages.length > 1 && (
                          <p
                            className="text-xs text-primary mt-2 text-center cursor-pointer hover:underline"
                            onClick={() => setLightbox({ roomId: room.id, index: 0 })}
                          >
                            View all {roomImages.length} photos
                          </p>
                        )}
                        {roomImages.length > 0 && isLightboxOpen && (
                          <RoomImageGallery
                            images={roomImages}
                            roomName={room.name}
                            initialIndex={lightbox!.index}
                            onClose={() => setLightbox(null)}
                            showThumbnails={false}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Price */}
                <tr className="border-b border-border bg-mint">
                  <td className="p-3 font-semibold bg-primary/10 sticky left-0 z-10 border-r-2 border-border">Price per Night</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <div className="text-2xl font-bold text-primary">
                        ₹{getInclusivePrice(getDisplayPrice(room)).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-muted-foreground">incl. taxes & fees</div>
                    </td>
                  ))}
                </tr>

                {/* Description */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Description</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <p className="text-sm text-foreground">{room.description || 'N/A'}</p>
                    </td>
                  ))}
                </tr>

                {/* Size */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Room Size</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-primary" />
                        <span className="text-sm">{room.size_sqm ? `${room.size_sqm} m²` : 'N/A'}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Max Occupancy */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Max Occupancy</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">
                          {room.max_occupancy} guests<br />
                          <span className="text-xs text-muted-foreground">
                            ({room.max_adults} adults, {room.max_children} children)
                          </span>
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Bed Configuration */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Bed Configuration</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-primary" />
                        <span className="text-sm">{room.bed_configuration || 'N/A'}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Availability */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 border-r-2 border-border">Availability</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3">
                      <Badge
                        variant={room.num_available_rooms > 3 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {room.num_available_rooms} room{room.num_available_rooms > 1 ? 's' : ''} left
                      </Badge>
                    </td>
                  ))}
                </tr>

                {/* Amenities */}
                <tr className="border-b border-border">
                  <td className="p-3 font-semibold bg-background sticky left-0 z-10 align-top border-r-2 border-border">Amenities</td>
                  {selectedRooms.map((room) => (
                    <td key={room.id} className="p-3 align-top">
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {Array.from(allAmenities).map((amenityName) => {
                          const hasAmenity = (room.room_type_amenities || room.room_amenities || []).some(
                            (a: any) => a.amenity?.name === amenityName
                          );
                          const Icon = getAmenityIcon(amenityName);
                          return (
                            <div key={amenityName} className="flex items-start gap-2 text-xs">
                              {hasAmenity ? (
                                <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                              )}
                              <span className={hasAmenity ? 'text-foreground' : 'text-muted-foreground'}>
                                {amenityName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Add to Booking */}
                <tr className="border-t-2 border-border bg-background">
                  <td className="p-3 font-semibold bg-muted sticky left-0 z-10 border-r-2 border-border">Book</td>
                  {selectedRooms.map((room) => {
                    const inCart = cart.has(room.id);
                    const cartQty = cart.get(room.id) ?? 1;
                    const isUnavailable = room.status !== 'available' || room.num_available_rooms === 0;
                    return (
                      <td key={room.id} className="p-3">
                        {inCart ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="flex items-center border rounded-md overflow-hidden">
                                <button
                                  className="px-2 py-1.5 hover:bg-muted transition-colors"
                                  onClick={() => updateQty(room.id, -1, room.num_available_rooms)}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-3 text-sm font-medium min-w-8 text-center">
                                  {cartQty}
                                </span>
                                <button
                                  className="px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                  onClick={() => updateQty(room.id, 1, room.num_available_rooms)}
                                  disabled={cartQty >= room.num_available_rooms}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeFromCart(room.id)}
                                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                              >
                                Remove
                              </Button>
                            </div>
                            <Badge variant="secondary" className="w-full justify-center text-xs">
                              <Check className="w-3 h-3 mr-1" /> Added to booking
                            </Badge>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addToCart(room.id)}
                            disabled={isUnavailable}
                            className="w-full gap-2"
                            size="lg"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Booking
                          </Button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dialog footer: proceed if cart has items */}
          {cart.size > 0 && (
            <div className="px-6 py-4 border-t bg-background flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {Array.from(cart.values()).reduce((s, q) => s + q, 0)} room
                {Array.from(cart.values()).reduce((s, q) => s + q, 0) !== 1 ? 's' : ''} in booking
              </p>
              <Button
                size="lg"
                onClick={() => {
                  setShowCompareDialog(false);
                  handleBookNow();
                }}
                className="gap-2"
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
