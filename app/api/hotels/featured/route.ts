import { NextResponse } from 'next/server'
import { HotelService } from '@/lib/services/hotel.service'
import { withApiLogging } from '@/lib/utils/with-api-logging'

const handler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    const hotels = await HotelService.getFeaturedHotels(limit)

    return NextResponse.json({
      success: true,
      data: hotels,
      count: hotels.length,
    })
  } catch (error: any) {
    console.error('Unexpected error in featured hotels API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        data: [],
      },
      { status: 500 }
    )
  }
}

export const GET = withApiLogging(handler, 'hotels/featured')
