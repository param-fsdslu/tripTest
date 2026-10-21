import { BoatForm } from '@/components/admin/BoatForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBoatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/boats"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Boat</h1>
          <p className="text-muted-foreground mt-2">Create a new boat listing</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Boat Details</CardTitle></CardHeader>
        <CardContent><BoatForm /></CardContent>
      </Card>
    </div>
  )
}
