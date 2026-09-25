"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { submitKycAction, type KycState } from "@/app/actions/kyc";

const initialState: KycState = {};

const DOCUMENT_OPTIONS = [
  { value: "PASSPORT", label: "Passport" },
  { value: "NATIONAL_ID", label: "National ID (MyKad)" },
  { value: "DRIVING_LICENSE", label: "Driving Licence" },
  { value: "OTHER", label: "Other government-issued ID" },
];

/**
 * Member-facing KYC submission form. Uploads an identity document (JPEG/PNG/
 * WebP/PDF, ≤10 MB) and creates a PENDING `kyc_records` row for admin review. */
export function KycForm() {
  const [state, action, pending] = useActionState<KycState, FormData>(
    submitKycAction,
    initialState
  );

  return (
    <form action={action} className="space-y-5">
      {state?.success && (
        <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
          Submitted! Your identity document is now pending admin review.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="documentType" className="text-xs font-semibold text-muted-foreground">
          Document type
        </Label>
        <Select
          id="documentType"
          name="documentType"
          placeholder="Select document type"
          options={DOCUMENT_OPTIONS}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentRef" className="text-xs font-semibold text-muted-foreground">
          Document reference (optional)
        </Label>
        <Input
          id="documentRef"
          name="documentRef"
          placeholder="e.g. last 4 digits or ID number"
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">
          Do not include your full ID number - a partial reference is enough for admin review.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document" className="text-xs font-semibold text-muted-foreground">
          Identity document
        </Label>
        <Input
          id="document"
          name="document"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
        />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or PDF, up to 10 MB. Your document is stored privately and only visible to Jomlink admins for verification.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Submitting…" : "Submit for verification"}
      </Button>
    </form>
  );
}