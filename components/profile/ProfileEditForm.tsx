'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { compressImage } from '@/lib/utils/image-compression'
import { updateProfile } from '@/lib/actions/profile'
import { uploadUserImage } from '@/lib/actions/uploads'

const profileSchema = z.object({
  firstName: z.string().max(50).optional().or(z.literal('')),
  lastName: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileEditFormProps {
  email: string
  profile: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    profile_image?: string | null
  } | null
}

export function ProfileEditForm({ email, profile }: ProfileEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileImage, setProfileImage] = useState<string | null>(profile?.profile_image || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
    },
  })

  const getInitials = () => {
    if (profile?.first_name) return profile.first_name.charAt(0).toUpperCase()
    return email.charAt(0).toUpperCase()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPEG, PNG, and WebP images are allowed.' })
      return
    }

    setUploadingImage(true)
    setMessage(null)

    try {
      const compressed = await compressImage(file)

      const formData = new FormData()
      formData.append('file', compressed)
      const uploaded = await uploadUserImage('profile-images', formData)

      if (!uploaded.url) {
        setMessage({ type: 'error', text: 'Failed to upload image.' })
        return
      }

      const publicUrl = uploaded.url
      setProfileImage(publicUrl)

      // Save immediately
      const result = await updateProfile({ profileImage: publicUrl })
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to save image.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload image.' })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true)
    setMessage(null)

    const result = await updateProfile({
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      phone: data.phone || undefined,
      profileImage: profileImage || undefined,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile.' })
    }

    setSaving(false)
  }

  return (
    <Card className="rounded-2xl shadow-[0_2px_12px_rgba(16,127,120,0.07)] border-border/60">
      <CardHeader>
        <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
          Edit Profile
        </CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-white shadow-[0_4px_16px_rgba(16,127,120,0.15)] ring-2 ring-gold/30">
                {profileImage ? (
                  <AvatarImage src={profileImage} alt="Profile" />
                ) : null}
                <AvatarFallback
                  className="bg-primary text-2xl text-white font-bold"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="text-xs text-muted-foreground">Click to upload a profile photo</p>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed as it is used for authentication.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="Enter your phone number"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-primary/8 text-primary border border-primary/20'
                  : 'bg-destructive/8 text-destructive border border-destructive/20'
              }`}
            >
              {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <Button
            type="submit"
            disabled={saving || uploadingImage}
            className="rounded-full bg-primary hover:bg-primary-hover shadow-none font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
