"use client";

import { useFormStatus } from "react-dom";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recoverClawbackAction, cancelClawbackAction } from "@/app/actions/clawbacks";

function RecoverButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Retry recovery
    </Button>
  );
}

/**
 * Admin controls for an open clawback (§5.12.1, §11.7).
 *
 * Two deliberate safeguards:
 *   • Retry only recovers what the wallet can actually cover — the server
 *     re-plans the amount, so this can never over-draw the balance.
 *   • Writing off the remainder requires a typed reason, because §11.7 requires
 *     a recorded basis for leaving money unrecovered.
 */
export function ClawbackControls({ clawbackId }: { clawbackId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <form
        action={recoverClawbackAction}
        onSubmit={(e) => {
          if (
            !confirm(
              "Attempt recovery again? This debits whatever the Linker's wallet can currently cover."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="clawbackId" value={clawbackId} />
        <RecoverButton />
      </form>

      <form
        action={cancelClawbackAction}
        onSubmit={(e) => {
          const note = prompt(
            "Why is the remaining balance not recoverable? (recorded in the audit log)"
          );
          if (!note || !note.trim()) {
            e.preventDefault();
            return;
          }
          // Populate the hidden field that the server action validates.
          const input = e.currentTarget.elements.namedItem("note");
          if (input instanceof HTMLInputElement) input.value = note.trim();
          if (
            !confirm(
              "Close this clawback as unrecoverable? The outstanding amount will be recorded as written off."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="clawbackId" value={clawbackId} />
        <input type="hidden" name="note" value="" />
        <Button type="submit" size="sm" variant="ghost" className="text-xs">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Write off remainder
        </Button>
      </form>
    </div>
  );
}
