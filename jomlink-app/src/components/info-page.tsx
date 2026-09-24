import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

/**
 * Shared shell for public informational pages (How it works, Fees, Trust & Safety,
 * Prohibited activities). Keeps header/footer, typography and CTA consistent.
 */
export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
  cta,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <header className="mb-10">
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{intro}</p>
        </header>

        <div className="space-y-8">{children}</div>

        {cta && (
          <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
            <Button asChild>
              <Link href={cta.href}>
                {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/** A titled section with optional ordered/unordered content. */
export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
