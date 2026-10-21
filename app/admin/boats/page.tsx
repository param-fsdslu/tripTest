import { getAllBoats } from '@/lib/actions/boat-admin'
import { BoatsTable } from '@/components/admin/BoatsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function AdminBoatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const city = typeof params.city === 'string' ? params.city : undefined
  const status = typeof params.status === 'string' ? params.status : undefined

  const result = await getAllBoats({ city, status, page, limit: 20 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Boats Management</h1>
          <p className="text-muted-foreground mt-2">Manage all boats and trips</p>
        </div>
        <Button asChild>
          <Link href="/admin/boats/new"><Plus className="h-4 w-4 mr-2" />Add New Boat</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Boats</CardTitle>
          <CardDescription>
            {result.success ? `${result.pagination?.total || 0} total boats` : 'Failed to load boats'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <BoatsTable boats={result.boats} pagination={result.pagination} />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
