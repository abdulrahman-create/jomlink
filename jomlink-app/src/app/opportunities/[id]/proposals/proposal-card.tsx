"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NegotiationPanel } from "@/components/negotiation-panel";
import { selectLinkerAction, type NegotiationState } from "@/app/actions/negotiations";
import {
  isOpportunitySelectable,
  isOpportunityTerminal,
  isProposalNegotiable,
  isProposalSelectable,
} from "@/lib/status";
import type { LinkedMember } from "@/lib/matching";
import type { LinkerProposalRow, ProposalNegotiationRow } from "@/lib/jomlink-types";

const initialState: NegotiationState = {};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SELECTED: "Selected",
  COMPLETED: "Completed",
};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export function ProposalCard({
  proposal,
  matchScore,
  matchLabelText,
  matchReasonText,
  opportunityStatus,
  walletBalance,
}: {
  proposal: LinkerProposalRow & {
    users?: LinkedMember | null;
    connections?: { id: string }[] | null;
  };
  /** Retained in the prop contract; the card routes by proposal id. */
  opportunityId?: string;
  /**
   * The opportunity's status. A CLOSED opportunity (COMPLETED/CANCELLED/EXPIRED)
   * must not offer Select or Counter-offer, however its proposals are labelled —
   * the proposal rows lag behind the opportunity because completing the
   * connection does not rewrite them.
   */
  opportunityStatus?: string;
  /**
   * The Seeker's available wallet credit. Selecting settles the full reward from
   * it, so passing this in lets the card refuse up front instead of letting the
   * member press Select and be told they are short. `undefined` means the balance
   * was not loaded — fall back to the server's own check rather than blocking.
   */
  walletBalance?: number | null;
  /** Precomputed server-side — the score runs on relationship data the client does not hold. */
  matchScore?: number | null;
  matchLabelText?: string | null;
  matchReasonText?: string | null;
}) {
  const [selectState, selectAction, selectPending] = useActionState<
    NegotiationState,
    FormData
  >(selectLinkerAction, initialState);

  const [negotiations, setNegotiations] = React.useState<ProposalNegotiationRow[]>([]);

  // Load negotiation thread on mount — needed here to decide whether the Seeker
  // may accept (you cannot accept your own standing offer).
  React.useEffect(() => {
    fetch(`/api/proposals/${proposal.id}/negotiations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNegotiations(Array.isArray(data) ? data : []))
      .catch(() => setNegotiations([]));
  }, [proposal.id]);

  const latest = negotiations.length > 0 ? negotiations[negotiations.length - 1] : null;
  const canAcceptTerms = latest ? latest.from_role !== "SEEKER" : true;

  /**
   * The reward that will actually be committed to escrow.
   *
   * Precedence:
   *   1. a previously agreed reward (terms already locked), else
   *   2. the last counter-offer in the thread — that is the number currently on
   *      the table, and either side may accept it — else
   *   3. the Linker's original ask.
   *
   * Note this is the amount *on the table*, not a settled price: a counter-offer
   * from the Seeker is still their own proposal, so the figure may move again.
   * It is the right number to check affordability against, because it is what
   * Select/Accept would commit.
   */
  const effectiveReward =
    proposal.agreed_reward ?? latest?.offered_reward ?? proposal.proposed_reward;

  // Authority lives in lib/status.ts — see the note there about the five
  // divergent lists this replaced.
  const negotiable = isProposalNegotiable(proposal.status);
  const selectable = isProposalSelectable(proposal.status);

  // A proposal's own status is NOT enough: completing the connection does not
  // rewrite proposal rows, so a `Selected` or `Under review` proposal can sit on
  // an opportunity that is already COMPLETED. Gate on the opportunity too, or a
  // finished project keeps offering Select and Counter-offer.
  const oppClosed = isOpportunityTerminal(opportunityStatus);
  const canNegotiate = negotiable && !oppClosed;

  // A SELECTED proposal already escrowed the reward — unless the connection was
  // never created, in which case the Seeker can press Select to finish it.
  const needsConnection = proposal.status === "SELECTED" && !proposal.connections?.length;
  const canSelect =
    (selectable || needsConnection) &&
    (isOpportunitySelectable(opportunityStatus) || needsConnection);

  // Selecting settles the full reward from the Seeker's wallet. Check it here so
  // an unaffordable Select is refused before the click, not after.
  // `needsConnection` re-opens an already-funded handoff, which must not be
  // re-charged, so affordability does not apply to it.
  const shortfall =
    !needsConnection && typeof walletBalance === "number"
      ? Math.max(0, effectiveReward - walletBalance)
      : 0;
  const canAfford = shortfall <= 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">
                {proposal.users?.full_name ?? "Linker"}
              </p>
              <Badge variant={proposal.status === "SELECTED" ? "success" : "secondary"}>
                {STATUS_LABEL[proposal.status] ?? proposal.status}
              </Badge>
              {proposal.is_target_substitution && (
                <Badge variant="warning">Target substitution</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {proposal.users?.country ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {matchScore != null && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
                  aria-hidden="true"
                >
                  {matchScore}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight">
                    {matchLabelText ?? "Match"}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {matchReasonText ?? "Relevance score"}
                  </p>
                </div>
              </div>
            )}
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{money(proposal.proposed_reward)}</p>
              <p className="text-xs text-muted-foreground">Proposed reward</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="font-semibold text-muted-foreground">Relationship basis</p>
            <p>{proposal.relationship_declared}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Deliverable</p>
            <p>{proposal.proposed_deliverable}</p>
          </div>
          {proposal.proposed_target && (
            <div>
              <p className="font-semibold text-muted-foreground">Proposed target</p>
              <p>{proposal.proposed_target}</p>
            </div>
          )}
          {proposal.proposed_method && (
            <div>
              <p className="font-semibold text-muted-foreground">Method</p>
              <p>{proposal.proposed_method}</p>
            </div>
          )}
          {proposal.substitution_reason && (
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Substitution reason</p>
              <p>{proposal.substitution_reason}</p>
            </div>
          )}
          {proposal.remarks && (
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Remarks</p>
              <p>{proposal.remarks}</p>
            </div>
          )}
        </div>

        {/* Negotiation — shared with the Linker's dashboard so both sides see
            and can answer the same counter-offer thread. */}
        <NegotiationPanel
          proposalId={proposal.id}
          currentReward={proposal.agreed_reward ?? proposal.proposed_reward}
          currentDeliverable={proposal.agreed_deliverable ?? proposal.proposed_deliverable}
          status={proposal.status}
          negotiable={canNegotiate}
          canAccept={canAcceptTerms}
          shortfall={shortfall}
        />

        {/* Explain the missing controls rather than leaving the card looking
            broken: the proposal's own badge may read "Under review" on an
            opportunity that has already finished. */}
        {oppClosed && (
          <p className="text-xs text-muted-foreground">
            This opportunity is{" "}
            {(opportunityStatus ?? "").toLowerCase()}, so this proposal can no
            longer be selected or negotiated.
          </p>
        )}

        {/* Actions */}
        {canSelect && (
          <div className="flex flex-wrap gap-2">
            <form action={selectAction}>
              <input type="hidden" name="proposalId" value={proposal.id} />
              {/*
                Commit the EFFECTIVE reward, not the Linker's original ask. Once
                either side has countered, the number that was agreed is the last
                offer in the thread — submitting `proposed_reward` here would
                escrow the stale opening figure (e.g. RM2,200) after the parties
                had settled on RM2,100, and the helper text below would contradict
                the amount actually charged.
              */}
              <input type="hidden" name="agreedReward" value={effectiveReward} />
              <input
                type="hidden"
                name="agreedDeliverable"
                value={proposal.agreed_deliverable ?? proposal.proposed_deliverable ?? ""}
              />
              <Button
                type="submit"
                size="sm"
                disabled={selectPending || !canAfford}
              >
                {selectPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {needsConnection
                  ? "Complete acceptance (open the connection)"
                  : "Select this Linker"}
              </Button>
            </form>
          </div>
        )}

        {canSelect && !needsConnection && canAfford && (
          <p className="text-xs text-muted-foreground">
            Selecting commits the full agreed reward from your wallet into escrow
            and opens the connection. Make sure your wallet covers{" "}
            {money(effectiveReward)}.
          </p>
        )}

        {/* Short of the reward: say by how much and offer the fix, rather than
            letting the member press Select and hit a rejection. */}
        {canSelect && !needsConnection && !canAfford && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              You need {money(shortfall)} more to select this Linker.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Selecting commits {money(effectiveReward)} from your wallet, but your
              balance is {money(walletBalance ?? 0)}.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/dashboard/wallet">Top up wallet</Link>
            </Button>
          </div>
        )}

        {needsConnection && (
          <p className="text-xs font-medium text-amber-700">
            This Linker is selected but their connection was never opened, so they
            cannot start. Press the button above to finish the handoff.
          </p>
        )}

        {selectState?.error && (
          <p className="text-sm text-destructive">{selectState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}