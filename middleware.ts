import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { isRouteBlocked } from '@/lib/config/features';
import { SESSION_COOKIE } from '@/lib/firebase/auth/constants';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block routes for disabled features (returns 404)
  if (isRouteBlocked(pathname)) {
    return new Response('Not Found', { status: 404 });
  }

  // Skip i18n middleware for API routes and the auth callback — only feature blocking applies
  if (pathname.startsWith('/api') || pathname.endsWith('/auth/callback')) {
    return;
  }

  // Admin routes have no locale prefix; app/admin/layout.tsx checks the session and role
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];

  // Check if accessing a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.includes(route)
  );

  // Middleware runs on the edge (Netlify/Vercel), where firebase-admin can't run, so this is
  // only a cookie-presence check. Pages verify the session itself: protected pages redirect
  // to login when it is invalid, and the login/signup pages redirect signed-in users to the
  // dashboard (app/[locale]/auth/login/page.tsx, signup/page.tsx).
  if (isProtectedRoute && !request.cookies.has(SESSION_COOKIE)) {
    const locale = pathname.split('/')[1];
    const validLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${validLocale}/auth/login`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(en|es|fr)/:path*',
    '/admin/:path*',
    '/api/:path*',
    '/((?!_next|_vercel|.*\\..*).*)'
  ],
};
