"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labelBiometricAction } from "@/app/actions/admin";

function SubmitButton({
  label,
  value,
  active,
  icon,
}: {
  label: string;
  value: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={active ? "default" : "outline"}
      name="labelStatus"
      value={value}
      disabled={pending}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      {label}
    </Button>
  );
}

/**
 * Admin labelling control for a biometric capture. These labels become the
 * ground-truth training set for the future automated face-match model.
 */
export function LabelBiometricForm({
  biometricId,
  current,
}: {
  biometricId: string;
  current: string;
}) {
  return (
    <form action={labelBiometricAction} className="flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="biometricId" value={biometricId} />
      <SubmitButton
        label="Match"
        value="MATCH"
        active={current === "MATCH"}
        icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
      />
      <SubmitButton
        label="No match"
        value="NO_MATCH"
        active={current === "NO_MATCH"}
        icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
      />
      <SubmitButton
        label="Unusable"
        value="UNUSABLE"
        active={current === "UNUSABLE"}
        icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
      />
    </form>
  );
}
