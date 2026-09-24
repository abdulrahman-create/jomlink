"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, MessageSquare, Send, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  counterOfferAction,
  acceptTermsAction,
  selectLinkerAction,
  type NegotiationState,
} from "@/app/actions/negotiations";
import { formatDate } from "@/lib/constants";
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
  opportunityId,
}: {
  proposal: LinkerProposalRow & { users?: { full_name?: string; country?: string } | null };
  opportunityId: string;
}) {
  const [counterState, counterAction, counterPending] = useActionState<
    NegotiationState,
    FormData
  >(counterOfferAction, initialState);
  const [acceptState, acceptAction, acceptPending] = useActionState<
    NegotiationState,
    FormData
  >(acceptTermsAction, initialState);
  const [selectState, selectAction, selectPending] = useActionState<
    NegotiationState,
    FormData
  >(selectLinkerAction, initialState);

  const [negotiations, setNegotiations] = React.useState<ProposalNegotiationRow[]>([]);
  const [showCounter, setShowCounter] = React.useState(false);
  const [showAccept, setShowAccept] = React.useState(false);

  // Load negotiation thread on mount.
  React.useEffect(() => {
    fetch(`/api/proposals/${proposal.id}/negotiations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNegotiations(data))
      .catch(() => setNegotiations([]));
  }, [proposal.id]);

  const isOpen = !["SELECTED", "COMPLETED", "REJECTED", "WITHDRAWN"].includes(proposal.status);

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
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{money(proposal.proposed_reward)}</p>
            <p className="text-xs text-muted-foreground">Proposed reward</p>
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

        {/* Negotiation thread */}
        <div className="rounded-md border border-border bg-muted p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Negotiation
          </p>
          {negotiations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No counter-offers yet.</p>
          ) : (
            <ul className="space-y-2">
              {negotiations.map((n) => (
                <li key={n.id} className="rounded-md bg-card p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {n.from_role === "LINKER" ? "Linker" : "Seeker"} offered{" "}
                      {money(n.offered_reward)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  {n.message && <p className="mt-1 text-muted-foreground">{n.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        {isOpen && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCounter((v) => !v)}
            >
              Counter-offer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAccept((v) => !v)}
            >
              Accept terms
            </Button>
            <form action={selectAction}>
              <input type="hidden" name="proposalId" value={proposal.id} />
              <input type="hidden" name="agreedReward" value={proposal.proposed_reward} />
              <input
                type="hidden"
                name="agreedDeliverable"
                value={proposal.proposed_deliverable ?? ""}
              />
              <Button type="submit" size="sm" disabled={selectPending}>
                {selectPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                )}
                Select this Linker
              </Button>
            </form>
          </div>
        )}

        {selectState?.error && (
          <p className="text-sm text-destructive">{selectState.error}</p>
        )}

        {/* Counter-offer form */}
        {showCounter && (
          <form action={counterAction} className="space-y-3 rounded-md border border-border p-3">
            <input type="hidden" name="proposalId" value={proposal.id} />
            <div className="space-y-2">
              <Label htmlFor={`reward-${proposal.id}`}>Offered reward (MYR)</Label>
              <Input
                id={`reward-${proposal.id}`}
                name="offeredReward"
                type="number"
                min={1}
                step="0.01"
                defaultValue={proposal.proposed_reward}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`msg-${proposal.id}`}>Message (optional)</Label>
              <Textarea id={`msg-${proposal.id}`} name="message" rows={2} />
            </div>
            {counterState?.error && (
              <p className="text-sm text-destructive">{counterState.error}</p>
            )}
            <Button type="submit" size="sm" disabled={counterPending}>
              {counterPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Post counter-offer
            </Button>
          </form>
        )}

        {/* Accept terms form */}
        {showAccept && (
          <form action={acceptAction} className="space-y-3 rounded-md border border-border p-3">
            <input type="hidden" name="proposalId" value={proposal.id} />
            <div className="space-y-2">
              <Label htmlFor={`agree-reward-${proposal.id}`}>Agreed reward (MYR)</Label>
              <Input
                id={`agree-reward-${proposal.id}`}
                name="agreedReward"
                type="number"
                min={1}
                step="0.01"
                defaultValue={proposal.proposed_reward}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`agree-deliv-${proposal.id}`}>Agreed deliverable</Label>
              <Textarea
                id={`agree-deliv-${proposal.id}`}
                name="agreedDeliverable"
                rows={2}
                defaultValue={proposal.proposed_deliverable ?? ""}
              />
            </div>
            {acceptState?.error && (
              <p className="text-sm text-destructive">{acceptState.error}</p>
            )}
            <Button type="submit" size="sm" disabled={acceptPending}>
              {acceptPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Lock agreed terms
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}