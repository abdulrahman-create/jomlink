"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Rocket, Coins, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  publishOpportunityAction,
  type OpportunityState,
} from "@/app/actions/opportunities";
import {
  fundOpportunityAction,
  releaseRewardAction,
  refundOpportunityAction,
  type TransactionState,
} from "@/app/actions/transactions";

const oppInit: OpportunityState = {};
const txInit: TransactionState = {};

export function PublishOpportunity({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState<OpportunityState, FormData>(
    publishOpportunityAction,
    oppInit
  );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={opportunityId} />
      {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Rocket className="h-4 w-4" aria-hidden="true" />
        )}
        Publish opportunity
      </Button>
    </form>
  );
}

export function FundOpportunity({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState<TransactionState, FormData>(
    fundOpportunityAction,
    txInit
  );

  return (
    <form action={action}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Coins className="h-4 w-4" aria-hidden="true" />
        )}
        Fund now (reward + 10% fee)
      </Button>
    </form>
  );
}

export function ReleaseReward({
  opportunityId,
  linkerId,
}: {
  opportunityId: string;
  linkerId: string;
}) {
  const [state, action, pending] = useActionState<TransactionState, FormData>(
    releaseRewardAction,
    txInit
  );

  return (
    <form action={action}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="linkerId" value={linkerId} />
      {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        Release reward to Linker (3% fee)
      </Button>
    </form>
  );
}

export function RefundOpportunity({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState<TransactionState, FormData>(
    refundOpportunityAction,
    txInit
  );

  return (
    <form action={action}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        )}
        Refund to me
      </Button>
    </form>
  );
}