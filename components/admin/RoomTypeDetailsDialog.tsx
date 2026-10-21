'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomTypeImagesManager } from './RoomTypeImagesManager'
import { RoomTypeAmenitiesManager } from './RoomTypeAmenitiesManager'

interface RoomTypeDetailsDialogProps {
  roomType: any
  onClose: () => void
}

export function RoomTypeDetailsDialog({
  roomType,
  onClose,
}: RoomTypeDetailsDialogProps) {
  const router = useRouter()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{roomType.name}</DialogTitle>
          <DialogDescription>
            Manage images and amenities for this room type
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-4">
            <RoomTypeImagesManager
              roomTypeId={roomType.id}
              images={roomType.room_type_images || []}
            />
          </TabsContent>

          <TabsContent value="amenities" className="mt-4">
            <RoomTypeAmenitiesManager
              roomTypeId={roomType.id}
              currentAmenities={roomType.room_type_amenities || []}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
