"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptTermsAction,
  counterOfferAction,
  type NegotiationState,
} from "@/app/actions/negotiations";
import { FEES, formatDate, formatMYR } from "@/lib/constants";
import type { ProposalNegotiationRow } from "@/lib/jomlink-types";

const initialState: NegotiationState = {};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

/**
 * The negotiation thread plus the counter-offer / accept controls.
 *
 * Both parties use this same panel. It is rendered from the Seeker's opportunity
 * page and from the Linker's `/dashboard/proposals` list, because a counter-offer
 * is a two-sided conversation: whichever side is not the author of the latest
 * offer has to be able to answer it. `counterOfferAction` and `acceptTermsAction`
 * each re-derive the caller's role server-side, so nothing here is trusted for
 * authorization.
 *
 * `negotiable` is passed in rather than derived from `status` here. This
 * component is a client component and must not own the state machine — the
 * authority is `isProposalNegotiable()` in `lib/status.ts`, evaluated on the
 * server. Deriving it locally is what previously let a SELECTED (already-escrowed,
 * terms-locked) proposal keep offering Counter-offer and Accept.
 */
export function NegotiationPanel({
  proposalId,
  currentReward,
  currentDeliverable,
  status,
  /** Server-computed: may the terms still change? */
  negotiable,
  /** Hide the accept button when the caller is the author of the live offer. */
  canAccept = true,
  /**
   * Server-computed affordability for the accepting party. The Seeker funds the
   * reward, so when they would be short the Accept button is refused up front
   * rather than letting them commit to terms they cannot pay for.
   * `undefined` skips the check (e.g. when the viewer is the Linker, who is paid
   * rather than charged).
   */
  shortfall = 0,
  compact = false,
}: {
  proposalId: string;
  currentReward: number;
  currentDeliverable?: string | null;
  status: string;
  negotiable: boolean;
  canAccept?: boolean;
  shortfall?: number;
  compact?: boolean;
}) {
  const [counterState, counterAction, counterPending] = useActionState<
    NegotiationState,
    FormData
  >(counterOfferAction, initialState);

  const [acceptState, acceptAction, acceptPending] = useActionState<
    NegotiationState,
    FormData
  >(acceptTermsAction, initialState);

  const [negotiations, setNegotiations] = React.useState<ProposalNegotiationRow[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [showCounter, setShowCounter] = React.useState(false);
  // Bumped after a successful counter-offer to re-fetch the thread.
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/proposals/${proposalId}/negotiations`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setNegotiations(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setNegotiations([]);
        setLoaded(true);
      });
    return () => controller.abort();
  }, [proposalId, refreshKey]);

  // After a successful counter-offer, close the form and reload the thread so the
  // new row appears. `useActionState` gives us no post-success callback, so the
  // transition is driven from the rendered state instead.
  if (counterState?.success && showCounter) {
    setShowCounter(false);
    setRefreshKey((k) => k + 1);
  }

  const isOpen = negotiable;
  const latest = negotiations.length > 0 ? negotiations[negotiations.length - 1] : null;
  const acceptAmount = latest?.offered_reward ?? currentReward;
  const canAfford = shortfall <= 0;

  // Locking in terms only makes sense while the proposal is live.
  const showActions = isOpen;
  const showAccept = showActions && canAccept;

  return (
    <div className="space-y-3">
      {/* Thread */}
      <div className="rounded-md border border-border bg-muted p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          Negotiation
        </p>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading thread…</p>
        ) : negotiations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No counter-offers yet.</p>
        ) : (
          <ul className="space-y-2">
            {negotiations.map((n) => (
              <li key={n.id} className="rounded-md bg-card p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {n.from_role === "LINKER" ? "Linker" : "Seeker"} offered{" "}
                    {money(n.offered_reward)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(n.created_at)}
                  </span>
                </div>
                {n.message && (
                  <p className="mt-1 text-muted-foreground">{n.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {latest && isOpen && (
          <p className="mt-2 text-xs text-muted-foreground">
            Latest offer stands at <strong>{money(latest.offered_reward)}</strong>.{" "}
            {canAccept
              ? "Accept it to lock the terms, or post a counter-offer."
              : "Your counterparty can accept it, or you can revise it with another counter-offer."}
          </p>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => setShowCounter((v) => !v)}
          >
            {showCounter ? "Cancel" : "Counter-offer"}
          </Button>
          {showAccept && (
            <form action={acceptAction}>
              <input type="hidden" name="proposalId" value={proposalId} />
              <input
                type="hidden"
                name="agreedReward"
                value={latest?.offered_reward ?? currentReward}
              />
              <input
                type="hidden"
                name="agreedDeliverable"
                value={currentDeliverable ?? ""}
              />
              <Button
                type="submit"
                size={compact ? "sm" : "default"}
                disabled={acceptPending || !canAfford}
              >
                {acceptPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                Accept {money(acceptAmount)}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Short of the agreed reward: surface the gap and the fix, rather than
          letting the Seeker commit to terms they cannot fund. */}
      {showAccept && !canAfford && (
        <p className="text-xs font-medium text-amber-700">
          You need {money(shortfall)} more to accept this offer. Accepting commits{" "}
          {money(acceptAmount)} to escrow. Top up your wallet first.
        </p>
      )}

      {acceptState?.error && (
        <p className="text-sm text-destructive">{acceptState.error}</p>
      )}

      {/* Counter-offer form */}
      {showCounter && (
        <form
          action={counterAction}
          className="space-y-3 rounded-md border border-border p-3"
        >
          <input type="hidden" name="proposalId" value={proposalId} />
          <div className="space-y-2">
            <Label htmlFor={`reward-${proposalId}`}>Offered reward (MYR)</Label>
            <Input
              id={`reward-${proposalId}`}
              name="offeredReward"
              type="number"
              min={FEES.MIN_OPPORTUNITY_REWARD}
              step="0.01"
              defaultValue={latest?.offered_reward ?? currentReward}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum {formatMYR(FEES.MIN_OPPORTUNITY_REWARD)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`msg-${proposalId}`}>Message (optional)</Label>
            <Textarea id={`msg-${proposalId}`} name="message" rows={2} />
          </div>
          {counterState?.error && (
            <p className="text-sm text-destructive">{counterState.error}</p>
          )}
          {counterState?.fieldErrors?.offeredReward && (
            <p className="text-sm text-destructive">
              {counterState.fieldErrors.offeredReward[0]}
            </p>
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

      {!isOpen && (
        <p className="text-xs text-muted-foreground">
          {status === "SELECTED"
            ? "A Linker has been selected and the reward is committed to escrow, so the terms are locked. Negotiation is closed."
            : "This proposal is closed, so negotiation is no longer available."}
        </p>
      )}
    </div>
  );
}
