import { getAllHotels } from '@/lib/actions/admin'
import { HotelsTable } from '@/components/admin/HotelsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function AdminHotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const city = typeof params.city === 'string' ? params.city : undefined
  const status = typeof params.status === 'string' ? params.status : undefined

  const result = await getAllHotels({
    city,
    status,
    page,
    limit: 20,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hotels Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all hotels and properties
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/hotels/new">
            <Plus className="h-4 w-4 mr-2" />
            Add New Hotel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Hotels</CardTitle>
          <CardDescription>
            {result.success
              ? `${result.pagination?.total || 0} total hotels`
              : 'Failed to load hotels'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <HotelsTable
              hotels={result.hotels}
              pagination={result.pagination}
            />
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
