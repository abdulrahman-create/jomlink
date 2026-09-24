import { notFound } from "next/navigation";
import { BadgeCheck, ShieldCheck, Star, MapPin, Briefcase } from "lucide-react";
import {
  getUserById,
  getMemberProfileWithEmployment,
  getRelationships,
  getMemberReputation,
  getReviewsForSubject,
} from "@/lib/queries";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RELATIONSHIP_CATEGORIES, formatDate } from "@/lib/constants";
import type { EmploymentRow, ReviewRow } from "@/lib/jomlink-types";

const CATEGORY_LABEL = Object.fromEntries(
  RELATIONSHIP_CATEGORIES.map((c) => [c.value, c.label])
);

export default async function PublicMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [member, profile, relationships, reputation, reviews] = await Promise.all([
    getUserById(id).catch(() => null),
    getMemberProfileWithEmployment(id).catch(() => null),
    getRelationships(id).catch(() => []),
    getMemberReputation(id).catch(() => null),
    getReviewsForSubject(id).catch(() => []),
  ]);

  if (!member) notFound();

  const p = profile;
  const initial = (member.full_name || "U").charAt(0).toUpperCase();

  // PRIVACY: only public relationships are shown.
  const publicRelationships = (relationships ?? []).filter(
    (r) => r.visibility === "PUBLIC"
  );

  return (
    <>
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {/* Identity */}
        <Card className="overflow-hidden">
          <div className="brand-band px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-bold text-primary">
                {initial}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{member.full_name}</h1>
                  {p?.verified_badge && (
                    <Badge variant="verified" className="gap-1">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-white/85">{p?.headline ?? "Jomlink Member"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/75">
                  {p?.current_organisation && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" aria-hidden="true" /> {p.current_organisation}
                    </span>
                  )}
                  {(p?.city || member.location || member.country) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" /> {[p?.city, p?.country ?? member.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CardContent className="grid grid-cols-3 gap-4 p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {reputation?.successful_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                {reputation?.average_rating?.toString() ?? "—"}
                {reputation?.average_rating != null && (
                  <Star className="h-5 w-5 fill-warning text-warning" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {reputation?.success_rate != null
                  ? `${Math.round(reputation.success_rate)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {p?.bio && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-pretty">{p.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Reviews & trust */}
        {reviews.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reviews</CardTitle>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                {(
                  (reviews as ReviewRow[]).reduce(
                    (s: number, r: ReviewRow) => s + r.rating,
                    0
                  ) / (reviews as ReviewRow[]).length
                ).toFixed(1)}{" "}
                / 5
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {reviews.map((rev: ReviewRow) => (
                  <li key={rev.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1 text-sm">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDate(rev.created_at)}
                      </span>
                    </div>
                    {rev.comment && <p className="mt-1 text-sm text-muted-foreground">{rev.comment}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Professional experience */}
        {p && p.employment_history.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Professional experience</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {p.employment_history.map((job: EmploymentRow) => (
                  <li key={job.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold">{job.position}</p>
                    <p className="text-sm text-muted-foreground">{job.organisation}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.current
                        ? "Current"
                        : job.start_date
                        ? `${formatDate(job.start_date)} — ${job.end_date ? formatDate(job.end_date) : "present"}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Public relationships */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Professional relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publicRelationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No public relationships declared yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {publicRelationships.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted p-3">
                    <div>
                      <p className="font-semibold">
                        {r.entity_name} <span className="text-muted-foreground">—</span>{" "}
                        <span className="text-primary">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                      </p>
                      {r.relevance_note && (
                        <p className="text-sm text-muted-foreground">{r.relevance_note}</p>
                      )}
                    </div>
                    {r.verified && (
                      <Badge variant="success" className="gap-1">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private contact details are not shown publicly on Jomlink.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}