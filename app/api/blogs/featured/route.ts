import { createClient } from '@/lib/db/server'
import { NextResponse } from 'next/server'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (request: Request) => {
  try {
    const db = await createClient()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    const { data: blogs, error } = await db
      .from('blogs')
      .select('id, title, slug, excerpt, featured_image, published_at, view_count, tags')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json(blogs || [])
  } catch (error: any) {
    console.error('Error fetching featured blogs:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export const GET = withApiLogging(handler, 'blogs/featured')
