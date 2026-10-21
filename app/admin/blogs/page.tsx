import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { getAllBlogs, getBlogStats } from '@/lib/actions/blogs'
import { BlogsTable } from '@/components/admin/BlogsTable'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Blog Management - Admin Dashboard',
  description: 'Manage blog posts and content',
}

export default async function BlogsPage() {
  // Check if user is super admin
  const isSuperAdmin = await checkIsSuperAdmin()
  if (!isSuperAdmin) {
    redirect('/admin')
  }

  // Get blogs and stats
  const { blogs, error } = await getAllBlogs()
  const { stats } = await getBlogStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Blog Management
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage blog posts</p>
        </div>
        <Link href="/admin/blogs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Blog Post
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Blogs</div>
          <div className="text-2xl font-bold mt-1">{stats.totalBlogs}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Published</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.publishedBlogs}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Drafts</div>
          <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.draftBlogs}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Views</div>
          <div className="text-2xl font-bold mt-1">{stats.totalViews.toLocaleString()}</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading blogs</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Blogs Table */}
      <BlogsTable blogs={blogs} />
    </div>
  )
}
