import Link from "next/link";
import { ArrowRight, MapPin, ShieldAlert, Timer } from "lucide-react";
import { listActiveOpportunities } from "@/lib/queries";
import { OPPORTUNITY_CATEGORIES, formatDate } from "@/lib/constants";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const metadata = {
  title: "Marketplace · Jomlink",
  description:
    "Browse live business-introduction opportunities posted by Seekers. Filter by category, country and reward.",
};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
  }).format(Number(n ?? 0));
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const minReward = typeof sp.min === "string" ? Number(sp.min) || undefined : undefined;
  const maxReward = typeof sp.max === "string" ? Number(sp.max) || undefined : undefined;

  const opportunities = await listActiveOpportunities({
    search: q || undefined,
    category: category || undefined,
    country: country || undefined,
    minReward,
    maxReward,
  });

  // Public listing only shows non-sensitive info (confidentiality respected).
  const visible = opportunities.filter(
    (o) => o.confidentiality === "PUBLIC" || o.confidentiality === "MATCHED"
  );

  const countries = Array.from(
    new Set(visible.map((o) => o.geographic_preference).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Marketplace</h1>
            <p className="mt-2 text-muted-foreground">
              Browse live business-introduction opportunities posted by Seekers.
            </p>
          </div>
          <Button asChild>
            <Link href="/opportunities/new">
              Post an Opportunity <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <form className="mb-8 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input name="q" defaultValue={q} placeholder="Search title…" aria-label="Search" />
          <Select
            name="category"
            defaultValue={category}
            placeholder="All categories"
            options={OPPORTUNITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <Select
            name="country"
            defaultValue={country}
            placeholder="All countries"
            options={countries.map((c) => ({ value: c, label: c }))}
          />
          <Input name="min" type="number" min={0} defaultValue={minReward ?? ""} placeholder="Min reward" aria-label="Min reward" />
          <div className="flex gap-2">
            <Input name="max" type="number" min={0} defaultValue={maxReward ?? ""} placeholder="Max reward" aria-label="Max reward" />
            <Button type="submit" variant="outline">Filter</Button>
          </div>
        </form>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No live opportunities match your filters yet. Check back soon or post your own.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((o) => (
              <Card key={o.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{o.title}</CardTitle>
                    {o.is_restricted_category && (
                      <Badge variant="warning" className="shrink-0 gap-1">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Restricted
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{o.category.replace(/_/g, " ")}</Badge>
                    {o.geographic_preference && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" /> {o.geographic_preference}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{o.purpose}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                    <div>
                      <p className="text-lg font-bold text-primary">{money(o.offer_amount)}</p>
                      <p className="text-xs text-muted-foreground">Reward</p>
                    </div>
                    {o.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(o.deadline)}
                      </span>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/opportunities/${o.id}`}>View details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}