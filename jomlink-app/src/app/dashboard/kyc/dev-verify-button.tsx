"use client";

import { useFormStatus } from "react-dom";
import { Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { devVerifySelfKycAction } from "@/app/actions/kyc";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Verify me (dev)
    </Button>
  );
}

/**
 * DEV / TEST ONLY — one-click identity verification for the current member.
 *
 * Rendered only when the server has already decided the bypass is available
 * (`KYC_DEV_BYPASS=true` and NOT production). The server action re-checks the
 * same guard, so hiding/removing this component is never the enforcement.
 */
export function DevVerifyButton() {
  return (
    <form action={devVerifySelfKycAction}>
      <SubmitButton />
    </form>
  );
}
