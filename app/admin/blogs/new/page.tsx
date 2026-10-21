import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { BlogForm } from '@/components/admin/BlogForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Create Blog Post - Admin Dashboard',
  description: 'Create a new blog post',
}

export default async function NewBlogPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/blogs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Blogs
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Blog Post</h1>
        <p className="text-muted-foreground mt-1">Write and publish a new blog post</p>
      </div>

      {/* Blog Form */}
      <BlogForm />
    </div>
  )
}
