'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createHotel, updateHotel } from '@/lib/actions/admin'
import { Loader2 } from 'lucide-react'

// Extract the src URL from a Google Maps embed iframe code
function parseIframeSrc(iframeCode: string): string | null {
  const match = iframeCode.match(/src="([^"]+)"/)
  if (match) return match[1]
  return null
}

interface HotelFormProps {
  hotel?: any
  isEdit?: boolean
}

export function HotelForm({ hotel, isEdit = false }: HotelFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    slug: hotel?.slug || '',
    description: hotel?.description || '',
    address_line_1: hotel?.address_line_1 || '',
    address_line_2: hotel?.address_line_2 || '',
    city: hotel?.city || '',
    state: hotel?.state || '',
    postal_code: hotel?.postal_code || '',
    country: hotel?.country || 'India',
    latitude: hotel?.latitude || '',
    longitude: hotel?.longitude || '',
    maps_embed_url: hotel?.maps_embed_url || '',
    mapsEmbedCode: '',
    phone: hotel?.phone || '',
    email: hotel?.email || '',
    website: hotel?.website || '',
    star_rating: hotel?.star_rating || '',
    property_type: hotel?.property_type || '',
    check_in_from_time: hotel?.check_in_from_time || '14:00',
    check_in_to_time: hotel?.check_in_to_time || '23:00',
    check_out_time: hotel?.check_out_time || '11:00',
    cancellation_policy_text: hotel?.cancellation_policy_text || '',
    child_policy_text: hotel?.child_policy_text || '',
    pet_policy_text: hotel?.pet_policy_text || '',
    status: hotel?.status || 'active',
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-generate slug from name
    if (field === 'name' && !isEdit) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cancellation_policy_text.trim()) {
      alert('Cancellation policy is required')
      return
    }

    setIsSubmitting(true)

    try {
      const { mapsEmbedCode: _mapsEmbedCode, ...rest } = formData
      const hotelData = {
        ...rest,
        star_rating: formData.star_rating ? parseInt(formData.star_rating) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }

      const result = isEdit
        ? await updateHotel(hotel.id, hotelData)
        : await createHotel(hotelData)

      if (result.success) {
        router.push('/admin/hotels')
        router.refresh()
      } else {
        alert(result.error || 'Failed to save hotel')
      }
    } catch (error) {
      alert('Failed to save hotel')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Hotel Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Grand Plaza Hotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
              placeholder="grand-plaza-hotel"
            />
            <p className="text-xs text-muted-foreground">Used in URL (e.g., /hotels/grand-plaza-hotel)</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Describe the hotel..."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="star_rating">Star Rating</Label>
            <Select
              value={formData.star_rating}
              onValueChange={(value) => handleChange('star_rating', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="2">2 Star</SelectItem>
                <SelectItem value="3">3 Star</SelectItem>
                <SelectItem value="4">4 Star</SelectItem>
                <SelectItem value="5">5 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type</Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => handleChange('property_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="resort">Resort</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="guesthouse">Guesthouse</SelectItem>
                <SelectItem value="hostel">Hostel</SelectItem>
                <SelectItem value="homestay">Homestay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Location</h3>

        <div className="space-y-2">
          <Label htmlFor="address_line_1">Address Line 1 *</Label>
          <Input
            id="address_line_1"
            value={formData.address_line_1}
            onChange={(e) => handleChange('address_line_1', e.target.value)}
            required
            placeholder="123 Main Street"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_line_2">Address Line 2</Label>
          <Input
            id="address_line_2"
            value={formData.address_line_2}
            onChange={(e) => handleChange('address_line_2', e.target.value)}
            placeholder="Near Central Park"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              required
              placeholder="Mumbai"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              required
              placeholder="Maharashtra"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => handleChange('postal_code', e.target.value)}
              placeholder="400001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="India"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mapsEmbedCode">Google Maps Embed Code</Label>
          <Textarea
            id="mapsEmbedCode"
            value={formData.mapsEmbedCode}
            onChange={(e) => {
              handleChange('mapsEmbedCode', e.target.value)
              const src = parseIframeSrc(e.target.value)
              if (src) handleChange('maps_embed_url', src)
            }}
            placeholder='Paste the <iframe> embed code from Google Maps → Share → Embed a map'
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            In Google Maps: click Share → Embed a map → select size Small → copy HTML → paste above.
          </p>
        </div>

        {formData.maps_embed_url && (
          <div className="rounded-md overflow-hidden border border-border">
            <iframe
              title="Location preview"
              width="100%"
              height="200"
              style={{ border: 0 }}
              src={formData.maps_embed_url}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@hotel.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://hotel.com"
            />
          </div>
        </div>
      </div>

      {/* Policies & Timings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Check-in/Check-out</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="check_in_from_time">Check-in From</Label>
            <Input
              id="check_in_from_time"
              type="time"
              value={formData.check_in_from_time}
              onChange={(e) => handleChange('check_in_from_time', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check_in_to_time">Check-in Until</Label>
            <Input
              id="check_in_to_time"
              type="time"
              value={formData.check_in_to_time}
              onChange={(e) => handleChange('check_in_to_time', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check_out_time">Check-out Time</Label>
            <Input
              id="check_out_time"
              type="time"
              value={formData.check_out_time}
              onChange={(e) => handleChange('check_out_time', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Policies</h3>

        <div className="space-y-2">
          <Label htmlFor="cancellation_policy_text">Cancellation Policy *</Label>
          <Textarea
            id="cancellation_policy_text"
            value={formData.cancellation_policy_text}
            onChange={(e) => handleChange('cancellation_policy_text', e.target.value)}
            required
            rows={3}
            placeholder="Free cancellation up to 24 hours before check-in..."
          />
          {!formData.cancellation_policy_text && (
            <p className="text-xs text-destructive">Cancellation policy is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="child_policy_text">Child Policy</Label>
          <Textarea
            id="child_policy_text"
            value={formData.child_policy_text}
            onChange={(e) => handleChange('child_policy_text', e.target.value)}
            rows={2}
            placeholder="Children of all ages are welcome..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pet_policy_text">Pet Policy</Label>
          <Textarea
            id="pet_policy_text"
            value={formData.pet_policy_text}
            onChange={(e) => handleChange('pet_policy_text', e.target.value)}
            rows={2}
            placeholder="Pets are allowed with prior approval..."
          />
        </div>

      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[150px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>{isEdit ? 'Update Hotel' : 'Create Hotel'}</>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/hotels')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
