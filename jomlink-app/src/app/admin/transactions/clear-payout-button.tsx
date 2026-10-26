"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearPayoutForPaymentAction } from "@/app/actions/admin";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Clear for payment
    </Button>
  );
}

/**
 * §11.9.2 — a Compliance administrator clears a payout that the AML screen held
 * for review. The rationale is mandatory: the clearance is an attributable
 * decision (`compliance:write`), recorded as `PAYOUT_COMPLIANCE_CLEARED`.
 *
 * This does NOT pay the payout — it only releases the hold so Finance can
 * settle it via "Mark as paid".
 */
export function ClearPayoutButton({ payoutId }: { payoutId: string }) {
  const [note, setNote] = React.useState("");

  return (
    <form
      action={clearPayoutForPaymentAction}
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        if (note.trim().length < 10) {
          e.preventDefault();
          return;
        }
        if (
          !confirm(
            "Clear this payout for payment? This records your identity as the Compliance approver on the audit trail."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="payoutId" value={payoutId} />
      <Input
        name="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Clearance rationale (min 10 chars)"
        className="h-8 text-xs"
        aria-label="Clearance rationale"
        required
      />
      <SubmitButton />
    </form>
  );
}
