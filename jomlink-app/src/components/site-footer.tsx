import Link from "next/link";
import { Logo } from "@/components/logo";

const FOOTER_COLS = [
  {
    title: "Platform",
    links: [
      { href: "/marketplace", label: "Opportunity Marketplace" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/fees", label: "Fees & Pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/trust-safety", label: "Trust & Safety" },
      { href: "/prohibited", label: "Prohibited Activities" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The marketplace for business introductions. Connect with people
              who can legitimately open the right doors.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Jomlink. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Jomlink facilitates introducions — it does not guarantee business outcomes.
          </p>
        </div>
      </div>
    </footer>
  );
}