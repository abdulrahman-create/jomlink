"use client";

import { useActionState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openClawbackAction } from "@/app/actions/clawbacks";
import { formatMYR } from "@/lib/constants";

/**
 * Admin control to open a post-release clawback (§5.12.1, §11.7).
 *
 * Shown only to admins with `finance:payout` on a connection whose reward has
 * already been released and is still inside the 7-day window. The server
 * re-checks every one of those conditions, so hiding this form is a courtesy,
 * not the control.
 */
export function OpenClawbackForm({
  connectionId,
  maxAmount,
  walletBalance,
}: {
  connectionId: string;
  maxAmount: number;
  walletBalance: number;
}) {
  const [state, action, pending] = useActionState<
    { error?: string },
    FormData
  >(async (_prev, formData) => {
    try {
      await openClawbackAction(formData);
      return {};
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Could not record the clawback.",
      };
    }
  }, {});

  // What the platform can actually get back right now, so the admin is never
  // surprised by a partial recovery after the fact.
  const recoverableNow = Math.min(maxAmount, walletBalance);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="connectionId" value={connectionId} />

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
        <p>
          <strong className="text-foreground">Max recoverable:</strong>{" "}
          {formatMYR(maxAmount)} (what was actually released to the Linker).
        </p>
        <p className="mt-1 text-muted-foreground">
          The Linker&apos;s wallet currently holds {formatMYR(walletBalance)}, so at
          most {formatMYR(recoverableNow)} can be recovered today. Any shortfall is
          recorded as outstanding and flagged for manual review — the wallet is
          never pushed negative.
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Label htmlFor="clawback-amount">Amount to recover (MYR)</Label>
        <Input
          id="clawback-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={maxAmount}
          required
          defaultValue={maxAmount.toFixed(2)}
        />
      </div>

      <div>
        <Label htmlFor="clawback-reason">Reason (recorded in the audit log)</Label>
        <Textarea
          id="clawback-reason"
          name="reason"
          rows={2}
          required
          placeholder="e.g. Investigation confirmed the introduction never took place."
        />
      </div>

      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          if (
            !confirm(
              "Open a clawback? This will debit the Linker's wallet for the recoverable amount and notify them."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        )}
        Recover funds
      </Button>
    </form>
  );
}
