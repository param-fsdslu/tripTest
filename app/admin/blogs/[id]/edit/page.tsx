import { redirect, notFound } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getBlogById } from '@/lib/actions/blogs'
import { BlogForm } from '@/components/admin/BlogForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Edit Blog Post - Admin Dashboard',
  description: 'Edit blog post',
}

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect('/admin')
  }

  // Await params (Next.js 15 requirement)
  const { id } = await params

  // Get blog data
  const { blog, error } = await getBlogById(id)

  if (error || !blog) {
    notFound()
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
        <h1 className="text-3xl font-bold tracking-tight">Edit Blog Post</h1>
        <p className="text-muted-foreground mt-1">Update your blog post content</p>
      </div>

      {/* Blog Form */}
      <BlogForm blog={blog} />
    </div>
  )
}
