"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Rocket, Send, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  publishOpportunityAction,
  type OpportunityState,
} from "@/app/actions/opportunities";
import {
  releaseRewardAction,
  refundOpportunityAction,
  cancelOpportunityAction,
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
        Release reward to Linker (10% fee)
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

export function CancelOpportunity({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState<TransactionState, FormData>(
    cancelOpportunityAction,
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
          <XCircle className="h-4 w-4" aria-hidden="true" />
        )}
        Cancel posting
      </Button>
    </form>
  );
}