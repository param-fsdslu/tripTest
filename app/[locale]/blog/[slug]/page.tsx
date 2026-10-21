import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CalendarDays, Eye, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

async function getBlogBySlug(slug: string) {
  const db = await createClient()

  const { data: blog, error } = await db
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !blog) return null

  // Increment view count
  await db
    .from('blogs')
    .update({ view_count: (blog.view_count || 0) + 1 })
    .eq('id', blog.id)

  return blog
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) notFound()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      <main className="grow pt-16 sm:pt-20">

        {/* ── Back nav ───────────────────────────────────────── */}
        <div className="border-b border-border/50 bg-background">
          <div className="page-container">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 py-3 text-xs font-semibold
                         text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Journal
            </Link>
          </div>
        </div>

        {/* ── Hero image ─────────────────────────────────────── */}
        {blog.featured_image && (
          <div className="w-full aspect-21/9 relative overflow-hidden bg-muted">
            <Image
              src={blog.featured_image}
              alt={blog.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {/* Subtle dark vignette bottom */}
            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
          </div>
        )}

        {/* ── Article header ─────────────────────────────────── */}
        <div className="page-container">
          <div className="max-w-3xl mx-auto">

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-8 mb-5">
                {blog.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-3 py-1
                               text-[10px] font-semibold uppercase tracking-wide
                               bg-primary/8 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight
                         text-foreground mb-5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {blog.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 pb-6 border-b border-border/60">
              {blog.published_at && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(blog.published_at)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {blog.view_count || 0} views
              </span>
            </div>

            {/* Excerpt — styled pull quote */}
            {blog.excerpt && (
              <blockquote
                className="border-l-[3px] border-gold pl-5 mb-8
                           text-base sm:text-lg text-muted-foreground leading-relaxed italic"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {blog.excerpt}
              </blockquote>
            )}
          </div>
        </div>

        {/* ── Article body ────────────────────────────────────── */}
        <div className="page-container pb-16 sm:pb-24">
          <div className="max-w-3xl mx-auto">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* ── Footer: back link + share ──────────────────── */}
            <div className="mt-14 pt-8 border-t border-border/60 flex items-center justify-between">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold
                           text-primary hover:text-gold transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Journal
              </Link>

              {/* Gold eyebrow branding */}
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <span className="h-px w-6 bg-gold/40" />
                <span
                  className="text-[10px] font-semibold tracking-widest uppercase text-gold/60"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Triplovia
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) return { title: 'Blog Post Not Found' }

  return {
    title: blog.meta_title || blog.title,
    description: blog.meta_description || blog.excerpt,
    openGraph: {
      title: blog.meta_title || blog.title,
      description: blog.meta_description || blog.excerpt,
      images: blog.featured_image ? [blog.featured_image] : [],
    },
  }
}
