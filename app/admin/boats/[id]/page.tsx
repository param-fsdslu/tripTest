import { getBoatById, getBoatTripTypes } from '@/lib/actions/boat-admin'
import { BoatForm } from '@/components/admin/BoatForm'
import { BoatImagesManager } from '@/components/admin/BoatImagesManager'
import { BoatAmenitiesManager } from '@/components/admin/BoatAmenitiesManager'
import { TripTypesManager } from '@/components/admin/TripTypesManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function EditBoatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getBoatById(id)
  const tripTypesResult = await getBoatTripTypes(id)

  if (!result.success || !result.boat) {
    redirect('/admin/boats')
  }

  const boat = result.boat
  const tripTypes = tripTypesResult.success ? tripTypesResult.tripTypes : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/boats"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Boat</h1>
          <p className="text-muted-foreground mt-2">{boat.name}</p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Boat Details</TabsTrigger>
          <TabsTrigger value="trips">Trip Types</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Boat Information</CardTitle>
              <CardDescription>Update boat details and settings</CardDescription>
            </CardHeader>
            <CardContent><BoatForm boat={boat} isEdit={true} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Types</CardTitle>
              <CardDescription>Manage trip types, pricing, and time slots</CardDescription>
            </CardHeader>
            <CardContent><TripTypesManager boatId={boat.id} tripTypes={tripTypes} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Boat Images</CardTitle>
              <CardDescription>Manage boat photos</CardDescription>
            </CardHeader>
            <CardContent><BoatImagesManager boatId={boat.id} images={boat.boat_images || []} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Boat Amenities</CardTitle>
              <CardDescription>Manage facilities and features</CardDescription>
            </CardHeader>
            <CardContent><BoatAmenitiesManager boatId={boat.id} currentAmenities={boat.boat_amenities || []} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
