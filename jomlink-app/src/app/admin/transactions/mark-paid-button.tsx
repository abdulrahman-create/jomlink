"use client";

import { useFormStatus } from "react-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPayoutPaidAction } from "@/app/actions/admin";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Mark as paid
    </Button>
  );
}

/**
 * Admin control to settle a member's bank withdrawal request. Posts to the
 * `markPayoutPaidAction` server action, which completes the ledger movement and
 * notifies the member. Confirms before submitting since it moves real money out.
 */
export function MarkPayoutPaidButton({ payoutId }: { payoutId: string }) {
  return (
    <form
      action={markPayoutPaidAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Mark this withdrawal as paid? This debits the member's wallet and records the transfer."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="payoutId" value={payoutId} />
      <SubmitButton />
    </form>
  );
}
