import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  MapPin,
  Pencil,
  ShieldAlert,
  Target,
  Timer,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getProfileByUserId,
  getRelationships,
  getEmployment,
  getProposalsByOpportunity,
  getProposalByLinkerAndOpportunity,
  getConnectionByOpportunity,
} from "@/lib/queries";
import { computeFunding } from "@/lib/funding";
import { computeMatchScore, matchLabel, matchReason, buildMatchInput, matchOpportunityFields } from "@/lib/matching";
import { OPPORTUNITY_CATEGORIES, formatDate } from "@/lib/constants";
import type { LinkerProposalRow } from "@/lib/jomlink-types";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PublishOpportunity,
  ReleaseReward,
  RefundOpportunity,
  CancelOpportunity,
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

/**
 * Statuses in which the owning Seeker may still edit their opportunity.
 * Editing is also blocked once any Linker has submitted a proposal, or once a
 * Linker is selected / the reward is in escrow (the listing is then committed).
 */
const EDITABLE_STATUSES = new Set([
  "DRAFT",
  "PENDING_PAYMENT",
  "ACTIVE",
  "PROPOSAL_RECEIVED",
  "NEGOTIATION",
]);

/**
 * Statuses that mean a Linker is already committed to this opportunity. Once any
 * of these is reached the listing can no longer take new proposals, so the
 * "Apply as a Linker" call-to-action must not render — not even for the Linker
 * who was just selected.
 */
const LINKER_COMMITTED_STATUSES = new Set([
  "LINKER_SELECTED",
  "AWAITING_CONFIRMATION",
  "IN_PROGRESS",
  "APPOINTMENT_SCHEDULED",
  "AWAITING_VERIFICATION",
  "COMPLETED",
  "DISPUTED",
]);

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SELECTED: "Selected",
  COMPLETED: "Completed",
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

  // The Seeker may edit while the status allows it AND no Linker has submitted
  // a proposal yet — a proposal freezes the terms it was based on.
  const canEdit =
    isOwner && EDITABLE_STATUSES.has(opp.status) && proposals.length === 0;

  // Has a Linker been committed to this opportunity? Either the opportunity
  // carries a linker_id, or it has progressed past the point of no return.
  const linkerCommitted =
    !!opp.linker_id || LINKER_COMMITTED_STATUSES.has(opp.status);

  // For a logged-in non-owner, look up their own proposal (if any) and the
  // connection once one exists. Both drive which call-to-action renders below:
  // a Linker who already applied must never see "Apply as a Linker" again.
  let myProposal: LinkerProposalRow | null = null;
  let myConnection: { id: string } | null = null;
  if (user && !isOwner) {
    myProposal = await getProposalByLinkerAndOpportunity(user.id, opp.id);
    if (myProposal?.status === "SELECTED" || linkerCommitted) {
      const conn = await getConnectionByOpportunity(opp.id);
      myConnection = conn && conn.linker_id === user.id ? { id: conn.id } : null;
    }
  }

  const iAmSelectedLinker = myProposal?.status === "SELECTED";
  const canApply =
    !isOwner && !myProposal && !linkerCommitted && opp.status === "ACTIVE";

  // For a logged-in Linker, compute a match score against their profile.
  let matchScore: number | null = null;
  let matchLabelText: string | null = null;
  let matchReasonText: string | null = null;
  if (user && !isOwner) {
    const [profile, relationships] = await Promise.all([
      getProfileByUserId(user.id),
      getRelationships(user.id),
    ]);
    const employment = profile ? await getEmployment(profile.id) : [];
    const matchInput = buildMatchInput({
      opportunity: matchOpportunityFields(opp),
      linker: {
        member_profiles: profile ? { ...profile, employment_history: employment } : null,
        relationships,
      },
    });
    matchScore = computeMatchScore(matchInput);
    matchLabelText = matchLabel(matchScore);
    matchReasonText = matchReason(matchInput);
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

        {/* Owner: edit the listing while it is still editable */}
        {canEdit && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="text-sm">
              <p className="font-semibold">Manage your listing</p>
              <p className="text-muted-foreground">
                You can edit the details, reward and deadline until a Linker submits a
                proposal.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={"/opportunities/" + opp.id + "/edit"}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit opportunity
              </Link>
            </Button>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && opp.status === "DRAFT" && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">Ready to publish?</p>
                <p className="text-muted-foreground">
                  Publishing deducts a {money(funding.postingDeposit)} posting
                  deposit (10% of the reward) from your wallet. If you cancel before
                  a Linker is selected, {money(funding.depositRefund)} is refunded and
                  the {money(funding.listingFee)} listing fee is retained. The reward
                  itself is only settled when you accept a Linker.
                </p>
              </div>
              <PublishOpportunity opportunityId={opp.id} />
            </CardContent>
          </Card>
        )}
        {isOwner &&
          opp.status === "ACTIVE" &&
          !opp.linker_id &&
          Number(opp.funded_amount || 0) <= 0 && (
            <Card className="mb-6 border-primary/30">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="text-sm">
                  <p className="font-semibold">Cancel this opportunity?</p>
                  <p className="text-muted-foreground">
                    No Linker has been selected yet. Cancelling refunds{" "}
                    {money(funding.depositRefund)} of your {money(funding.postingDeposit)}{" "}
                    posting deposit; the {money(funding.listingFee)} listing fee is
                    non-refundable.
                  </p>
                </div>
                <CancelOpportunity opportunityId={opp.id} />
              </CardContent>
            </Card>
          )}
        {isOwner && opp.status === "COMPLETED" && selected && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-semibold">Completed.</p>
                <p className="text-muted-foreground">
                  Release the escrowed reward to the selected Linker. A 10% service fee is
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
                  {matchReasonText ?? "Based on your profile, relationships and reputation"}.
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

              {isOwner ? (
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold">
                    <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Funding breakdown
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>Posting deposit (10%, refundable less listing fee)</span>
                      <span className="tabular-nums text-foreground">{money(funding.postingDeposit)}</span>
                    </li>
                    <li className="flex justify-between pl-4 text-xs">
                      <span className="italic">— incl. {money(funding.listingFee)} non-refundable listing fee</span>
                      <span className="tabular-nums">{money(funding.listingFee)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Reward (settled on Linker acceptance)</span>
                      <span className="tabular-nums text-foreground">{money(funding.reward)}</span>
                    </li>
                    <li className="flex justify-between border-t border-border pt-1 font-medium">
                      <span>Total cost to Seeker</span>
                      <span className="tabular-nums text-foreground">
                        {money(funding.reward + funding.postingDeposit)}
                      </span>
                    </li>
                  </ul>
                  <p className="mt-2 text-xs">
                    The deposit is charged at posting — the {money(funding.listingFee)} listing
                    fee is charged <strong className="text-foreground">inside</strong> the
                    deposit. It is refunded (less the listing fee) if you cancel before a Linker
                    is selected, and consumed on completion. The reward is held in escrow only
                    once you accept a Linker.
                  </p>
                </div>
              ) : (
                // Linkers only see the reward they are being offered. The Seeker's
                // posting deposit, listing fee and total cost are private.
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold">
                    <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Reward
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {money(funding.reward)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Settled to you on acceptance of your proposal, less the
                    platform&apos;s Linker service fee.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!isOwner && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            {iAmSelectedLinker ? (
              <>
                <p className="font-semibold text-primary">
                  You were selected for this opportunity.
                </p>
                {myConnection ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your proposal has been accepted and the reward is held in escrow.
                    Continue in your connection workspace to schedule the introduction.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your proposal was accepted, but the connection has not been
                    opened yet — the Seeker still needs to complete acceptance
                    (which funds the reward into escrow). It will appear here once
                    they do.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {myConnection && (
                    <Button asChild>
                      <Link href={"/dashboard/connections/" + myConnection.id}>
                        Go to connection
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/dashboard/proposals">Back to my proposals</Link>
                  </Button>
                </div>
              </>
            ) : myProposal ? (
              <>
                <p className="font-semibold">
                  You have already submitted a proposal.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {PROPOSAL_STATUS_LABEL[myProposal.status] ?? myProposal.status}
                  </span>{" "}
                  · Proposed reward {money(myProposal.proposed_reward)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link href="/dashboard/proposals">View my proposals</Link>
                  </Button>
                </div>
              </>
            ) : linkerCommitted ? (
              <>
                <p className="font-semibold">A Linker has been selected.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This opportunity is no longer open for new proposals.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/marketplace">Browse other opportunities</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold">Think you can make this introduction?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit a proposal as a Linker to offer your relationship and negotiate terms.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {canApply && (
                    <Button asChild>
                      <Link href={"/opportunities/" + opp.id + "/apply"}>
                        Apply as a Linker
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/dashboard/profile">Complete my profile</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}