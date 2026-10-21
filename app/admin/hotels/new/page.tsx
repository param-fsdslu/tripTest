import { HotelForm } from '@/components/admin/HotelForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewHotelPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/hotels">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Hotel</h1>
          <p className="text-muted-foreground mt-2">
            Create a new hotel property
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hotel Information</CardTitle>
          <CardDescription>
            Fill in the details below to add a new hotel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HotelForm />
        </CardContent>
      </Card>
    </div>
  )
}
