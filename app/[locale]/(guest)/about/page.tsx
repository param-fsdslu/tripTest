'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Eye,
  Target,
  Heart,
  MapPin,
  Mail,
  Phone,
  Send,
  CheckCircle,
  Users,
  Shield,
  Sparkles,
  Globe,
} from 'lucide-react'
import { useState } from 'react'

const values = [
  {
    icon: Heart,
    title: 'Guest First',
    description: 'Every decision we make starts with what is best for our guests.',
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    description: 'Verified properties, secure payments, and transparent pricing.',
  },
  {
    icon: Users,
    title: 'Local Partnerships',
    description: 'We work with local hosts to bring you authentic coastal experiences.',
  },
  {
    icon: Globe,
    title: 'Sustainable Tourism',
    description: 'Promoting responsible travel that benefits local communities.',
  },
]

export default function AboutPage() {
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormState('sending')
    setFormError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    }

    if (!data.name || !data.email || !data.message) {
      setFormError('Please fill in all required fields.')
      setFormState('idle')
      return
    }

    // Build WhatsApp message
    const text = [
      `*New Contact Form Submission*`,
      `*Name:* ${data.name}`,
      `*Email:* ${data.email}`,
      data.phone ? `*Phone:* ${data.phone}` : '',
      data.subject ? `*Subject:* ${data.subject}` : '',
      `*Message:* ${data.message}`,
    ]
      .filter(Boolean)
      .join('\n')

    window.open(
      `https://wa.me/919113887712?text=${encodeURIComponent(text)}`,
      '_blank'
    )

    setFormState('sent')
    ;(e.target as HTMLFormElement).reset()
    setTimeout(() => setFormState('idle'), 4000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      {/* ── Hero header ───────────────────────────────────── */}
      <div className="pt-16 sm:pt-20 border-b border-border/50 bg-primary">
        <div className="page-container py-14 sm:py-20 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-gold" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
              About Us
            </span>
            <span className="h-px w-8 bg-gold" />
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Your Trusted Travel Partner
          </h1>
          <p className="text-sm sm:text-base text-white/75 max-w-2xl mx-auto leading-relaxed">
            Triplovia makes it easy to discover, book, and enjoy the best hotels, boat rides, and experiences
            across coastal Karnataka. We connect travelers with verified local hosts for unforgettable stays.
          </p>
        </div>
      </div>

      <main className="grow">
        {/* ── Vision & Mission ──────────────────────────────── */}
        <section className="page-container py-14 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Vision */}
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h2
                  className="text-xl font-bold text-foreground mb-3"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Our Vision
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To become the most trusted travel platform for coastal Karnataka, making it effortless
                  for every traveler to discover hidden gems, book with confidence, and create memories
                  that last a lifetime. We envision a future where tourism uplifts local communities
                  while preserving the natural beauty of the coast.
                </p>
              </CardContent>
            </Card>

            {/* Mission */}
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center mb-5">
                  <Target className="h-6 w-6 text-gold" />
                </div>
                <h2
                  className="text-xl font-bold text-foreground mb-3"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Our Mission
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To provide a seamless booking experience with verified properties, transparent pricing,
                  and exceptional customer support. We are committed to partnering with local hotels,
                  boat operators, and experience hosts to bring the best of coastal Karnataka to
                  travelers from around the world.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Our Values ────────────────────────────────────── */}
        <section className="bg-muted/40 border-y border-border/50">
          <div className="page-container py-14 sm:py-20">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
                  What We Stand For
                </span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Our Values
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="text-center p-6 rounded-xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-11 w-11 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2">{value.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Legal Links ──────────────────────────────────── */}
        <section className="page-container pb-0">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-gold" />
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
                  Legal
                </span>
                <span className="h-px w-8 bg-gold" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Policies
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                { href: '/terms', label: 'Terms & Conditions' },
                { href: '/refund-policy', label: 'Cancellation & Refund Policy' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-center p-5 rounded-xl bg-background border border-border/50 shadow-sm
                             hover:shadow-md hover:border-primary/30 transition-all text-sm font-semibold
                             text-foreground hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact Section ───────────────────────────────── */}
        <section className="page-container py-14 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-gold" />
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
                  Get In Touch
                </span>
                <span className="h-px w-8 bg-gold" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Contact Us
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Have a question, feedback, or need help with a booking? We would love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Contact info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-md">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-0.5">Email</h3>
                        <a
                          href="mailto:triplovia@gmail.com"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          triplovia@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-0.5">Phone</h3>
                        <a
                          href="tel:+919113887712"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          +91 91138 87712
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-0.5">Address</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          First floor, 612, Honnavar Areangadi Road,<br />
                          Near BSNL Office, Hosakuli,<br />
                          Uttarakannada, Karnataka &ndash; 581334
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Business Type:</span> Online Travel Platform
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-semibold">GST:</span> 29AAZFT3826C1ZO
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact form */}
              <div className="lg:col-span-3">
                <Card className="border-none shadow-md">
                  <CardContent className="p-6 sm:p-8">
                    {formState === 'sent' ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                          <CheckCircle className="h-7 w-7 text-green-600" />
                        </div>
                        <h3
                          className="text-lg font-bold text-foreground mb-1"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          Message Sent!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Thank you for reaching out. We will get back to you soon.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="name">
                              Name <span className="text-destructive">*</span>
                            </Label>
                            <Input id="name" name="name" placeholder="Your full name" required />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="email">
                              Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="you@example.com"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" type="tel" placeholder="+91 91138 87712" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" name="subject" placeholder="How can we help?" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="message">
                            Message <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Tell us more about your query..."
                            rows={5}
                            required
                          />
                        </div>

                        {formError && (
                          <Alert variant="destructive">
                            <AlertDescription>{formError}</AlertDescription>
                          </Alert>
                        )}

                        <Button type="submit" className="w-full sm:w-auto" disabled={formState === 'sending'}>
                          <Send className="h-4 w-4 mr-2" />
                          {formState === 'sending' ? 'Sending...' : 'Send Message'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
