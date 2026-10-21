import { createClient } from '@/lib/db/server'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ArrowRight, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

async function getPublishedBlogs() {
  const db = await createClient()
  const { data: blogs, error } = await db
    .from('blogs')
    .select('id, title, slug, excerpt, featured_image, published_at, view_count, tags')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching blogs:', error)
    return []
  }
  return blogs || []
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const blogs = await getPublishedBlogs()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar transparent={false} />

      {/* ── Page hero header ──────────────────────────────── */}
      <div className="pt-16 sm:pt-20 bg-[var(--background)] border-b border-border/50">
        <div className="page-container py-10 sm:py-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-gold" />
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
                Journal
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Travel Stories &amp; Guides
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
              Discover coastal Karnataka through travel tips, destination guides, and stories.
            </p>
          </div>
        </div>
      </div>

      {/* ── Blog grid ─────────────────────────────────────── */}
      <main className="flex-grow">
        <div className="page-container py-10 sm:py-14">
          {blogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mb-4">
                <BookOpen className="h-7 w-7 text-primary/50" />
              </div>
              <h3
                className="text-lg font-bold text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                No posts yet
              </h3>
              <p className="text-sm text-muted-foreground">Check back soon for travel stories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {blogs.map((blog, i) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                >
                  <article
                    className="h-full rounded-2xl overflow-hidden bg-white flex flex-col
                               shadow-[0_2px_12px_rgba(16,127,120,0.07)]
                               hover:shadow-[0_8px_32px_rgba(16,127,120,0.14)]
                               transition-shadow duration-300"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted shrink-0">
                      {blog.featured_image ? (
                        <Image
                          src={blog.featured_image}
                          alt={blog.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={i < 3}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-primary/25" />
                        </div>
                      )}
                      {blog.published_at && (
                        <div className="absolute bottom-2.5 left-2.5 z-10">
                          <span className="inline-flex items-center rounded-full bg-black/45 backdrop-blur-sm
                                           text-white text-[10px] font-medium px-2.5 py-1">
                            {formatDate(blog.published_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {blog.tags.slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full px-2.5 py-0.5
                                         text-[10px] font-semibold uppercase tracking-wide
                                         bg-primary/8 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                          {blog.tags.length > 2 && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5
                                             text-[10px] font-semibold text-muted-foreground bg-muted">
                              +{blog.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <h2
                        className="text-base font-bold leading-snug line-clamp-2 mb-2
                                   text-foreground group-hover:text-primary transition-colors"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {blog.title}
                      </h2>

                      {blog.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-auto">
                          {blog.excerpt}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground">
                          {blog.view_count || 0} views
                        </span>
                        <span className="text-xs font-semibold text-primary flex items-center gap-1
                                         group-hover:text-gold transition-colors">
                          Read more
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
