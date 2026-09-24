import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Coins,
  MapPin,
  ShieldAlert,
  Target,
  Timer,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getProfileByUserId,
  getRelationships,
  getProposalsByOpportunity,
} from "@/lib/queries";
import { computeFunding } from "@/lib/funding";
import { computeMatchScore, matchLabel } from "@/lib/matching";
import { OPPORTUNITY_CATEGORIES, formatDate } from "@/lib/constants";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PublishOpportunity,
  FundOpportunity,
  ReleaseReward,
  RefundOpportunity,
} from "./actions";

export const metadata = { title: "Opportunity · Jomlink" };

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  ACTIVE: "Active",
  PROPOSAL_RECEIVED: "Proposal received",
  NEGOTIATION: "Negotiation",
  LINKER_SELECTED: "Linker selected",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  IN_PROGRESS: "In progress",
  APPOINTMENT_SCHEDULED: "Appointment scheduled",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  FAILED: "Failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user.id === opp.seeker_id;

  // The selected Linker (needed to release the reward when completed).
  const proposals = isOwner ? await getProposalsByOpportunity(opp.id) : [];
  const selected =
    proposals.find((p) => p.status === "SELECTED") ??
    proposals.find((p) => p.status === "ACCEPTED") ??
    null;

  // For a logged-in Linker, compute a match score against their profile.
  let matchScore: number | null = null;
  let matchLabelText: string | null = null;
  if (user && !isOwner) {
    const [profile, relationships] = await Promise.all([
      getProfileByUserId(user.id),
      getRelationships(user.id),
    ]);
    matchScore = computeMatchScore({
      opportunity: {
        category: opp.category,
        target_entity: opp.target_entity,
        target_role: opp.target_role,
        geographic_preference: opp.geographic_preference,
        is_restricted_category: opp.is_restricted_category,
      },
      profile: profile
        ? {
            industry: profile.industry,
            country: profile.country,
            current_organisation: profile.current_organisation,
            current_position: profile.current_position,
          }
        : null,
      relationships,
      verifiedBadge: profile?.verified_badge ?? false,
      yearsOfExperience: profile?.years_of_experience ?? null,
    });
    matchLabelText = matchLabel(matchScore);
  }

  const funding = computeFunding(Number(opp.offer_amount) || 0);
  const catLabel =
    OPPORTUNITY_CATEGORIES.find((c) => c.value === opp.category)?.label ?? opp.category;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to marketplace
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{catLabel}</Badge>
              <Badge variant={opp.status === "ACTIVE" ? "success" : "secondary"}>
                {STATUS_LABEL[opp.status] ?? opp.status}
              </Badge>
              {opp.is_restricted_category && (
                <Badge variant="warning" className="gap-1">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Restricted
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{opp.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {opp.geographic_preference && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> {opp.geographic_preference}
                </span>
              )}
              {opp.deadline && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-4 w-4" aria-hidden="true" /> Deadline {formatDate(opp.deadline)}
                </span>
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{money(opp.offer_amount)}</p>
            <p className="text-sm text-muted-foreground">Reward</p>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && opp.status === "DRAFT" && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">Ready to publish?</p>
                <p className="text-muted-foreground">
                  Publishing computes the 10% activation fee + reward escrow and records
                  simulated transactions.

                </p>
              </div>
              <PublishOpportunity opportunityId={opp.id} />
            </CardContent>
          </Card>
        )}
        {isOwner && opp.status === "PENDING_PAYMENT" && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">Awaiting funding.</p>
                <p className="text-muted-foreground">
                  Funding records the reward escrow + 10% activation fee via the
                  transaction ledger (simulated). Once funded, the opportunity goes live.
                </p>
              </div>
              <FundOpportunity opportunityId={opp.id} />
            </CardContent>
          </Card>
        )}
        {isOwner && opp.status === "COMPLETED" && selected && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">Completed.</p>
                <p className="text-muted-foreground">
                  Release the escrowed reward to the selected Linker. A 3% service fee is
                  deducted and kept by the platform.
                </p>
              </div>
              <ReleaseReward opportunityId={opp.id} linkerId={selected.linker_id} />
            </CardContent>
          </Card>
        )}
        {(isOwner &&
          (opp.status === "FAILED" ||
            opp.status === "CANCELLED" ||
            opp.status === "EXPIRED")) && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">This opportunity did not complete.</p>
                <p className="text-muted-foreground">
                  The escrowed reward can be refunded back to you.
                </p>
              </div>
              <RefundOpportunity opportunityId={opp.id} />
            </CardContent>
          </Card>
        )}

        {/* Match score for Linkers */}
        {!isOwner && matchScore != null && (
          <Card className="mb-6">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">
                {matchScore}
              </div>
              <div>
                <p className="font-semibold">{matchLabelText}</p>
                <p className="text-sm text-muted-foreground">
                  Relevance score based on your profile, relationships and reputation..
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What you need</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-muted-foreground">Target entity</p>
                <p>{opp.target_entity}</p>
              </div>
              {opp.target_role && (
                <div>
                  <p className="font-semibold text-muted-foreground">Target role</p>
                  <p className="inline-flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" /> {opp.target_role}
                    {opp.target_role_exact && (
                      <Badge variant="outline" className="ml-1">Exact</Badge>
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="font-semibold text-muted-foreground">Purpose</p>
                <p>{opp.purpose}</p>
              </div>
              {opp.connection_method && (
                <div>
                  <p className="font-semibold text-muted-foreground">Connection method</p>
                  <p>{opp.connection_method}</p>
                </div>
              )}
              {opp.acceptable_alternatives && (
                <div>
                  <p className="font-semibold text-muted-foreground">Acceptable alternatives</p>
                  <p>{opp.acceptable_alternatives}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deliverable &amp; funding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-muted-foreground">Required outcome</p>
                <p>{opp.required_outcome}</p>
              </div>
              {opp.business_description && (
                <div>
                  <p className="font-semibold text-muted-foreground">About the business</p>
                  <p>{opp.business_description}</p>
                </div>
              )}
              {opp.additional_requirements && (
                <div>
                  <p className="font-semibold text-muted-foreground">Additional requirements</p>
                  <p>{opp.additional_requirements}</p>
                </div>
              )}

              <div className="rounded-md border border-border bg-muted p-3">
                <p className="mb-2 flex items-center gap-1.5 font-semibold">
                  <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Funding breakdown
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex justify-between">
                    <span>Reward (escrow)</span>
                    <span className="tabular-nums text-foreground">{money(funding.reward)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Activation fee (10%)</span>
                    <span className="tabular-nums text-foreground">{money(funding.activationFee)}</span>
                  </li>
                  <li className="flex justify-between border-t border-border pt-1 font-medium">
                    <span>Total funded</span>
                    <span className="tabular-nums text-foreground">{money(funding.escrowAmount)}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {!isOwner && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">Think you can make this introduction?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a proposal as a Linker to offer your relationship and negotiate terms.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {opp.status === "ACTIVE" && (
                <Button asChild>
                  <Link href={"/opportunities/" + opp.id + "/apply"}>Apply as a Linker</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/dashboard/profile">Complete my profile</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}