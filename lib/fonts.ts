import { Inter, Manrope } from 'next/font/google'

/** Body text, navigation, buttons and forms */
export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

/** Headings, titles and hotel names */
export const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
})

/**
 * Put on <html>: Tailwind declares --font-sans/--font-heading on :root, so the next/font
 * variables they reference must be defined there too
 */
export const fontVariables = `${inter.variable} ${manrope.variable}`
