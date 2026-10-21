'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { SectionHeader } from '@/components/layout/SectionHeader';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  view_count: number;
  tags: string[] | null;
}

async function fetchFeaturedBlogs() {
  try {
    const response = await fetch('/api/blogs/featured');
    if (!response.ok) throw new Error('Failed to fetch blogs');
    return await response.json();
  } catch {
    return [];
  }
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function FeaturedBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeaturedBlogs().then((data) => {
      setBlogs(data);
      setIsLoading(false);
    });
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 bg-[var(--background)]">
        <div className="page-container flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!blogs || blogs.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-[var(--background)] overflow-hidden">
      <div className="page-container">

        {/* ── Section header ──────────────────────────────── */}
        <SectionHeader
          eyebrow="From the journal"
          title="Travel stories"
          action={
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-1.5">
                {(['left', 'right'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => scroll(dir)}
                    className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center
                               text-foreground hover:border-primary hover:text-primary transition-colors"
                    aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
                  >
                    {dir === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          }
        />

        {/* ── Scrolling card row ───────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide pb-2 snap-x-mandatory -mx-4 px-4"
        >
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blog/${blog.slug}`}
              className="block group shrink-0 w-[270px] sm:w-[300px] lg:w-[320px] snap-start
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
              <article
                className="h-full rounded-2xl overflow-hidden bg-card border border-border
                           hover:shadow-[0_16px_40px_-16px_rgba(7,63,61,0.28)]
                           transition-shadow duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                  {blog.featured_image ? (
                    <Image
                      src={blog.featured_image}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 270px, (max-width: 1024px) 300px, 320px"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/12 to-gold/12 flex items-center justify-center">
                      <span
                        className="text-primary/50 text-sm font-semibold"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Story
                      </span>
                    </div>
                  )}

                  {/* Date pill overlay */}
                  {blog.published_at && (
                    <div className="absolute bottom-2.5 left-2.5 z-10">
                      <span className="inline-flex items-center rounded-full bg-black/45 backdrop-blur-sm
                                       text-white text-[10px] font-medium px-2.5 py-1 leading-none">
                        {formatDate(blog.published_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Tags */}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {blog.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5
                                     text-[10px] font-semibold uppercase tracking-wide
                                     bg-primary/8 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className="text-[0.95rem] font-bold leading-snug line-clamp-2 mb-2
                               text-foreground group-hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {blog.title}
                  </h3>

                  {/* Excerpt */}
                  {blog.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {blog.excerpt}
                    </p>
                  )}

                  {/* Footer: read link */}
                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                      {blog.view_count || 0} views
                    </span>
                    <span
                      className="text-xs font-semibold text-primary flex items-center gap-1
                                 group-hover:text-gold transition-colors"
                    >
                      Read more
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* View all — mobile */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            View all posts <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
