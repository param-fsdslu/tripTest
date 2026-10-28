"use client";

import * as React from "react";
import {
  Menu,
  X,
  Home,
  Building2,
  Ship,
  Info,
  LogIn,
  UserPlus,
  LogOut,
  ChevronRight,
  Heart,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { ACCOUNT_LINKS } from "@/components/account/account-links";
import { getCurrentUser } from "@/lib/actions/session";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { TripsIcon } from "@/components/icons/TripsIcon";
import { formatPhone } from "@/lib/utils/phone";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { isFeatureEnabled, type FeatureName } from "@/lib/config/features";
import { useUIStore } from "@/lib/stores/use-ui-store";

interface NavbarProps {
  /** When false, the navbar always renders in the solid/opaque state (use on pages without a hero image). */
  transparent?: boolean;
}

export function Navbar({ transparent = true }: NavbarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [user, setUser] = React.useState<{ email?: string; label: string; initial: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const mobileOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileMenuOpen);
  const openAuth = useUIStore((s) => s.openAuth);
  const authVersion = useUIStore((s) => s.authVersion);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // solid = always show the opaque state when transparency is disabled, or when user has scrolled
  const solid = !transparent || scrolled;

  // Sign-in/out happen through server actions followed by navigation (or the login popup,
  // which bumps authVersion), so re-reading the session then keeps the menu in sync
  React.useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        if (!current) return setUser(null);
        const meta = current.user_metadata ?? {};
        // Mobile-only accounts may have no email yet
        const label = current.email || (meta.phone ? formatPhone(meta.phone) : "My account");
        const initial = (meta.first_name || current.email || "U").charAt(0).toUpperCase();
        setUser({ email: current.email ?? undefined, label, initial });
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, authVersion]);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/hotels", label: "Hotels", icon: Building2, feature: "hotels" as FeatureName },
    { href: "/boats", label: "Boat Trips", icon: Ship, feature: "boats" as FeatureName },
    { href: "/about", label: "About", icon: Info },
  ].filter((link) => !("feature" in link) || isFeatureEnabled(link.feature!));

  // Signed-in menu (profile dropdown + mobile sheet): the account sidebar's pages, in the same order
  const accountLinks = ACCOUNT_LINKS;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => { await signOut(); };

  const openTripsSignIn = () =>
    openAuth({ intent: "login", redirectTo: "/bookings", notice: "Sign in to see and manage your bookings." });

  /* ─── scrolled = frosted glass; at-top = transparent ─── */
  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        solid
          ? "bg-background/95 backdrop-blur-md shadow-[0_1px_0_0_var(--border)]"
          : "bg-transparent"
      )}
    >
      <div className="page-container flex h-16 sm:h-[72px] items-center justify-between">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" className={cn(
          "flex items-center gap-2 group transition-all",
          solid ? "" : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        )}>
          <Image
            src="/company-logo-only.svg"
            alt="Triplovia"
            width={40}
            height={40}
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
          <Image
            src="/company-logo-text-only.svg"
            alt="Triplovia"
            width={140}
            height={32}
            className={cn("h-7 w-auto hidden sm:block", !solid && "brightness-0 invert")}
          />
        </Link>

        {/* ── Desktop Nav ───────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-[15px] font-medium rounded-md transition-colors duration-200",
                  active
                    ? solid
                      ? "text-primary"
                      : "text-white"
                    : solid
                    ? "text-foreground/70 hover:text-primary"
                    : "text-white/80 hover:text-white"
                )}
              >
                {link.label}
                {active && (
                  <span
                    className={cn(
                      "absolute -bottom-px left-3 right-3 h-0.5 rounded-full",
                      solid ? "bg-primary" : "bg-gold"
                    )}
                  />
                )}
              </Link>
            );
          })}

          {/* My Trips: bookings shortcut (signed-out visitors sign in first, then land on it) */}
          <TripsButton
            solid={solid}
            active={isActive("/bookings")}
            signedOut={!loading && !user}
            onSignIn={openTripsSignIn}
            className="ml-1"
          />

          {/* Auth */}
          <div
            className={cn(
              "flex items-center gap-2 ml-2 pl-2 border-l",
              solid ? "border-border" : "border-white/20"
            )}
          >
            {loading ? (
              <div className="h-10 w-24 bg-white/10 animate-pulse rounded-full" />
            ) : user ? (
              <>
                <Link
                  href="/wishlist"
                  title="My Wishlist"
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                    solid
                      ? "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Heart className="h-5 w-5" />
                </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10 ring-2 ring-gold/40">
                      <AvatarFallback
                        className="bg-primary text-white text-sm font-semibold"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {user.initial}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold">My Account</p>
                      <p className="text-xs text-muted-foreground truncate">{user.label}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {accountLinks.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="cursor-pointer flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-10 rounded-lg px-4 font-medium text-[15px]",
                    solid ? "text-foreground" : "text-white hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => openAuth({ intent: "login" })}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-10 rounded-lg px-5 font-semibold text-[15px] shadow-none",
                    solid
                      ? "bg-primary text-white hover:bg-primary-hover"
                      : "bg-white text-primary hover:bg-white/90"
                  )}
                  onClick={() => openAuth({ intent: "signup" })}
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* ── Mobile: My Trips icon beside the hamburger ─────── */}
        <TripsButton
          compact
          solid={solid}
          active={isActive("/bookings")}
          signedOut={!loading && !user}
          onSignIn={openTripsSignIn}
          className="ml-auto mr-1 md:hidden"
        />

        {/* ── Mobile hamburger ──────────────────────────────── */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "md:hidden rounded-full h-10 w-10",
                solid ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/15"
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" hideClose className="w-[300px] sm:w-[340px] p-0 flex flex-col">
            {/* Header */}
            <div
              className="px-5 pt-6 pb-5"
              style={{ background: "linear-gradient(135deg, #107F78 0%, #073F3D 100%)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <SheetTitle className="flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  <Image src="/company-logo-only.svg" alt="Triplovia" width={28} height={28} className="h-7 w-7" />
                  <Image src="/company-logo-text-only.svg" alt="Triplovia" width={100} height={24} className="h-5 w-auto" />
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-white/55 text-xs">Explore coastal Karnataka</p>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-0.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/65 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="flex-1">{link.label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="my-4 border-t border-border/60" />

              {/* Auth section */}
              {loading ? (
                <div className="space-y-2 px-3">
                  <div className="h-10 bg-muted animate-pulse rounded-xl" />
                  <div className="h-10 bg-muted animate-pulse rounded-xl" />
                </div>
              ) : user ? (
                <div className="space-y-0.5">
                  {/* User card */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-muted/40">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-gold/30">
                      <AvatarFallback className="bg-primary text-white text-sm font-semibold">
                        {user.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-medium truncate">{user.label}</p>
                    </div>
                  </div>

                  {accountLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        pathname === href
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/65 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </Link>
                  ))}

                  <div className="my-3 border-t border-border/60" />
                  <button
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors w-full"
                  >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 px-1">
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); openAuth({ intent: "login" }); }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/65 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <LogIn className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                    <span>Sign In</span>
                  </button>
                  <div className="px-1 pt-1">
                    <Button
                      className="w-full font-semibold gap-2 rounded-xl bg-primary hover:bg-primary-hover"
                      onClick={() => { setMobileOpen(false); openAuth({ intent: "signup" }); }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Create Account
                    </Button>
                  </div>
                </div>
              )}
            </nav>

            {/* Footer */}
            <div className="border-t border-border/60 px-5 py-4">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                triplovia@gmail.com &middot; +91 91138 87712
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <AuthDialog />
    </header>
  );
}

interface TripsButtonProps {
  /** Navbar is opaque (scrolled / no hero) rather than over the hero photo */
  solid: boolean;
  active: boolean;
  /** Not signed in: open the login popup instead of linking */
  signedOut: boolean;
  onSignIn: () => void;
  /** Icon only (phones) */
  compact?: boolean;
  className?: string;
}

/** "My Trips" shortcut to the bookings page: bold suitcase chip, plus a two-line label from lg */
function TripsButton({ solid, active, signedOut, onSignIn, compact = false, className }: TripsButtonProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors duration-200",
          solid
            ? cn("bg-primary text-white group-hover:bg-primary-hover", active && "ring-2 ring-gold ring-offset-1 ring-offset-background")
            : cn("bg-white text-primary group-hover:bg-white/90", active && "ring-2 ring-gold")
        )}
      >
        <TripsIcon className="h-[23px] w-[23px]" />
      </span>
      {!compact && (
        <span className="hidden flex-col text-left leading-tight lg:flex">
          <span className={cn("font-heading text-[15px] font-extrabold", solid ? "text-foreground" : "text-white")}>
            My Trips
          </span>
          <span className={cn("text-xs font-medium", solid ? "text-muted-foreground" : "text-white/75")}>
            Manage bookings
          </span>
        </span>
      )}
    </>
  );
  const classes = cn("group flex items-center gap-2 rounded-xl", !compact && "lg:pr-1", className);

  if (signedOut) {
    return (
      <button type="button" onClick={onSignIn} aria-label="My Trips" title="My Trips: manage your bookings" className={classes}>
        {content}
      </button>
    );
  }
  return (
    <Link
      href="/bookings"
      aria-label="My Trips"
      aria-current={active ? "page" : undefined}
      title="My Trips: manage your bookings"
      className={classes}
    >
      {content}
    </Link>
  );
}
