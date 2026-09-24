import Link from "next/link";
import {
  ArrowRight,
  Handshake,
  ShieldCheck,
  MapPin,
  Search,
  Star,
  BadgeCheck,
  Users,
  Factory,
  Landmark,
  Mail,
  Globe,
  Sparkles,
  Quote,
  TrendingUp,
  Network,
  CircleDollarSign,
  FileCheck2,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageBackground } from "@/components/page-background";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";

/* ------------------------------------------------------------------ */
/* Blueprint-backed content                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_PREVIEWS = [
  { label: "Executive / Decision-Maker", count: "240+ Opportunities" },
  { label: "Investor Connection", count: "180+ Opportunities" },
  { label: "Business Introduction", count: "320+ Opportunities" },
  { label: "Supplier Connection", count: "150+ Opportunities" },
  { label: "Government / Public Sector", count: "40+ Opportunities" },
  { label: "Strategic Partner", count: "120+ Opportunities" },
];

// Lucide icons map 1:1 to each category for consistent structural glyphs.
const CATEGORY_ICONS = [Users, CircleDollarSign, Handshake, Factory, Landmark, Network];

const STEPS = [
  {
    step: "01",
    title: "Define your opportunity",
    desc: "Tell Jomlink what connection or introduction you need — and what successful completion looks like.",
    icon: FileCheck2,
  },
  {
    step: "02",
    title: "Get matched with Linkers",
    desc: "Our matching engine connects you with people who hold relevant, declared professional relationships.",
    icon: Network,
  },
  {
    step: "03",
    title: "Agree terms & connect",
    desc: "Compare proposals, negotiate the reward, and complete the introduction through a verified workflow.",
    icon: Handshake,
  },
  {
    step: "04",
    title: "Pay securely on success",
    desc: "Rewards are held securely and released only when the agreed deliverable is verified.",
    icon: ShieldCheck,
  },
];

const PROBLEMS = [
  {
    title: "Growth is gated by who you know",
    desc: "Finding the right investor, partner or decision-maker is nearly impossible without the right network.",
    icon: Lock,
  },
  {
    title: "Warm intros stay informal & untracked",
    desc: "Referrals happen in chat threads and coffee chats — with no agreed terms, reward or accountability.",
    icon: CircleDollarSign,
  },
  {
    title: "Cold outreach rarely lands",
    desc: "Reaching the right inbox is hard, and even a great pitch gets lost without a credible advocate.",
    icon: Mail,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Within two weeks, a Linker introduced me to the procurement team at a major GLC. The meeting happened exactly as agreed — and the verification workflow kept everything clear.",
    name: "Nadia Rahman",
    role: "Founder, NadiTech Solutions",
    initials: "NR",
  },
  {
    quote:
      "I've built a side income from relationships I already had. Jomlink made the value of my network tangible, and the escrow-style reward gave me confidence to engage.",
    name: "Azman Hassan",
    role: "Business Development Lead · Linker",
    initials: "AH",
  },
  {
    quote:
      "The matching engine floated me opportunities I never would have found. Target substitution meant I could still deliver value even where the exact person wasn't reachable.",
    name: "Farah Idris",
    role: "Consultant · Verified Member",
    initials: "FI",
  },
];

const TRUST_FEATURES = [
  { icon: BadgeCheck, title: "Verified identities", desc: "KYC-backed members with verified badges." },
  { icon: ShieldCheck, title: "Held rewards", desc: "Rewards held safely, released on verified completion." },
  { icon: Network, title: "Relationship-backed", desc: "Linkers declare and verify relevant relationships." },
  { icon: FileCheck2, title: "Defined deliverables", desc: "Clear terms, targets and evidence before payment." },
];

const BLUEPRINT_BENEFITS = [
  "One account to act as both Seeker and Linker",
  "Transparent reward holding, fees and release",
  "Ratings, reviews and reputation that travel with you",
  "Privacy-first relationship declarations",
];

export default function HomePage() {
  return (
    <>
      {/* Fixed page-wide background — stays put while the page scrolls over it */}
      <PageBackground imageSrc="/hero-background.jpg" />
      <SiteHeaderWithUser />
      <main className="relative z-10 flex-1">
        {/* HERO — transparent; the fixed PageBackground shows through */}
        <section className="relative flex min-h-[92vh] items-center overflow-hidden">
          {/* Local dark scrim so white hero text stays readable */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1A0B11]/80 via-[#1A0B11]/50 to-transparent"
          />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 text-white sm:px-6 sm:py-24 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge
                variant="secondary"
                className="mb-5 gap-1.5 border-white/20 bg-white/10 text-white backdrop-blur-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Trusted business introductions
              </Badge>
              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Access the people who can{" "}
                <span className="text-cotton-candy">open the right doors.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/85 text-pretty">
                Jomlink is a marketplace for business introductions. Connect with
                people who hold the professional relationships you need — investors,
                executives, customers, suppliers and decision-makers.
              </p>

              {/* Hero CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Find a connection <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link href="/marketplace">Browse Opportunities</Link>
                </Button>
              </div>

              {/* Trust stats */}
              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-8">
                {[
                  ["2,400+", "Business introductions"],
                  ["3,900+", "Verified relationships"],
                  ["4.8/5", "Average Linker rating"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="order-last text-xs text-white/65">{l}</dt>
                    <dd className="text-2xl font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Hero visual card */}
            <div className="relative hidden lg:block">
              {/* Opportunity card */}
              <div className="rounded-2xl border border-white/15 bg-white/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Executive Introduction — Prasarana
                  </span>
                  <Badge className="shrink-0">92% Match</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Executive / Decision-Maker Meeting
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                      <Handshake className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Azman Hassan</p>
                      <p className="text-xs text-muted-foreground">Guest contributor · Linker</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-warning">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> 4.9
                    </div>
                  </div>

                  <div className="flex items-stretch gap-3">
                    <div className="flex-1 rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Reward</p>
                      <p className="text-2xl font-bold text-primary">RM500</p>
                    </div>
                    <div className="flex-1 rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                        7 working days
                      </p>
                    </div>
                  </div>

                  {/* progress to completion */}
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Verification stage</span>
                      <span className="font-semibold text-primary">4 / 6</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-soft">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-carmine to-carmine-light" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Seeker acknowledgement locked · evidence under review
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating trust chip */}
              <div className="absolute -bottom-5 -left-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-bg text-success">
                    <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Introduction completed</p>
                    <p className="text-xs text-muted-foreground">Verified & rewarded</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* SEARCH STRIP */}
        <section className="border-y border-border bg-card/20 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <form className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search for a company, executive or opportunity..."
                  className="h-11 w-full rounded-lg border border-border bg-input pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search opportunities"
                />
              </div>
              <Button type="submit" size="lg">Search Marketplace</Button>
            </form>
          </div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section className="bg-background/20 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cotton-candy/60 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> The challenge
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Great business outcomes often depend on who you know.
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Jomlink turns &ldquo;who you know&rdquo; from an informal advantage into a
              structured, trusted marketplace.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Solution band */}
          <div className="brand-band mt-10 overflow-hidden rounded-2xl">
            <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Jomlink
                </span>
                <h3 className="font-display mt-4 text-2xl font-bold text-white text-balance sm:text-3xl">
                  A marketplace built on the people who can actually open the door.
                </h3>
                <ul className="mt-6 space-y-3">
                  {BLUEPRINT_BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-white/90">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cotton-candy" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" className="mt-8 bg-white text-primary hover:bg-white/90">
                  <Link href="/how-it-works">
                    See how it works <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Platform value pillars */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TRUST_FEATURES.map((f) => (
                  <div key={f.title} className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-cotton-candy">
                      <f.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h4 className="mt-3 font-semibold text-white">{f.title}</h4>
                    <p className="mt-1 text-sm text-white/75">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="border-y border-border bg-card/20 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cotton-candy/60 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Opportunity marketplace
                </span>
                <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Browse by category
                </h2>
                <p className="mt-3 text-pretty text-muted-foreground">
                  Find the right connection for your business opportunity.
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden shrink-0 sm:inline-flex">
                <Link href="/marketplace">
                  View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORY_PREVIEWS.map((c, idx) => {
                const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
                return (
                  <Link
                    key={c.label}
                    href={`/marketplace?category=${encodeURIComponent(c.label)}`}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-[var(--shadow-glow)]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground group-hover:text-primary">
                        {c.label}
                      </p>
                      <p className="text-sm text-muted-foreground">{c.count}</p>
                    </div>
                    <ChevronRight
                      className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-background/20 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cotton-candy/60 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> How it works
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              A transparent, verified process from request to connection.
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Four clear steps from defining what you need to a rewarded,
              verified introduction.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="relative rounded-xl border border-border bg-card p-6">
                <span className="absolute right-5 top-5 text-4xl font-bold text-primary-soft">{s.step}</span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-t border-border bg-card/20 py-16 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cotton-candy/60 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Trusted connections
              </span>
              <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                People are already opening the right doors.
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Seekers reach decision-makers. Linkers turn networks into value.
                Here&apos;s what they say.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
                >
                  <Quote className="h-6 w-6 text-cotton-candy" aria-hidden="true" />
                  <blockquote className="mt-4 flex-1 text-pretty text-muted-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-semibold text-white">
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="brand-band">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Built for Malaysia, ready to scale
            </span>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Ready to make a valuable connection?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-white/80">
              Whether you need access or can provide it, Jomlink helps you turn
              relationships into opportunities — securely and transparently.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/register">
                  Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/marketplace">Browse opportunities</Link>
              </Button>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-white/70">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Free to get started · Fees only apply on successful connections
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
