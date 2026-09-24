"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/fees", label: "Fees" },
  { href: "/trust-safety", label: "Trust & Safety" },
];

export function SiteHeader({
  user = null,
}: {
  user?: { name: string; email: string; verified?: boolean } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/opportunities/new">Post an Opportunity</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/opportunities/new" onClick={() => setOpen(false)}>Post an Opportunity</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register" onClick={() => setOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}