"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CalendarPlus,
  CheckCircle2,
  Undo2,
  Send,
  Star,
  Clock,
  FileCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  proposeAppointmentAction,
  acknowledgeAppointmentAction,
  type AppointmentState,
} from "@/app/actions/appointments";
import { submitEvidenceAction, type EvidenceState } from "@/app/actions/evidence";
import {
  markConnectionCompleteAction,
  requestExtensionAction,
  markConnectionFailedAction,
  type CompletionState,
} from "@/app/actions/completions";
import { submitReviewAction, type ReviewState } from "@/app/actions/reviews";

const emptyAppt: AppointmentState = {};

export function ProposeAppointment({
  connectionId,
  withError,
}: {
  connectionId: string;
  withError: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AppointmentState, FormData>(
    proposeAppointmentAction,
    emptyAppt
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-3 space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {withError && state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="date">Proposed date</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="method">Method</Label>
          <Input id="method" name="method" placeholder="e.g. Video call" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="e.g. Office, Zoom" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="target">Target</Label>
          <Input id="target" name="target" placeholder="Who is attending" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" name="remarks" rows={2} />
      </div>
      {state?.fieldErrors?.date && (
        <p className="text-sm text-destructive">{state.fieldErrors.date[0]}</p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        )}
        Propose appointment
      </Button>
    </form>
  );
}

export function AppointmentActions({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AppointmentState, FormData>(
    acknowledgeAppointmentAction,
    emptyAppt
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={action}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="decision" value="ACKNOWLEDGED" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          Acknowledge
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="decision" value="REJECTED" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <X className="h-4 w-4" aria-hidden="true" /> Reject
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

export function SubmitEvidence({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<EvidenceState, FormData>(
    submitEvidenceAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-3 space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="type">Evidence type</Label>
          <Select
            id="type"
            name="type"
            defaultValue="MEETING_CONFIRMATION"
            options={[
              { value: "INTRODUCTION", label: "Introduction" },
              { value: "COMMUNICATION", label: "Communication" },
              { value: "MEETING_PHOTO", label: "Meeting photo" },
              { value: "MEETING_SCREENSHOT", label: "Meeting screenshot" },
              { value: "APPOINTMENT_CONFIRMATION", label: "Appointment confirmation" },
              { value: "TARGET_ACKNOWLEDGEMENT", label: "Target acknowledgement" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fileUrl">File URL (optional)</Label>
          <Input id="fileUrl" name="fileUrl" placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      {state?.fieldErrors?.type && (
        <p className="text-sm text-destructive">{state.fieldErrors.type[0]}</p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileCheck className="h-4 w-4" aria-hidden="true" />
        )}
        Submit evidence
      </Button>
    </form>
  );
}

export function CompleteConnection({
  connectionId,
  status,
}: {
  connectionId: string;
  status: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CompletionState, FormData>(
    markConnectionCompleteAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  if (status === "COMPLETED") {
    return <p className="text-sm text-muted-foreground">This connection is complete.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-1">
        <Label htmlFor="completionNotes">Completion notes</Label>
        <Textarea id="completionNotes" name="completionNotes" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        )}
        Mark complete &amp; schedule release (7 days)
      </Button>
    </form>
  );
}

export function ExtensionForm({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CompletionState, FormData>(
    requestExtensionAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex items-end gap-3">
        <div className="w-32 space-y-1">
          <Label htmlFor="days">Extend by (days)</Label>
          <Input id="days" name="days" type="number" min={1} max={30} defaultValue={3} />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="mb-0.5">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Clock className="h-4 w-4" aria-hidden="true" />
          )}
          Request extension
        </Button>
      </div>
    </form>
  );
}

export function MarkFailed({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CompletionState, FormData>(
    markConnectionFailedAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action}>
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <p className="mb-1 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        )}
        Mark failed
      </Button>
    </form>
  );
}

export function ReviewForm({
  opportunityId,
  subjectId,
}: {
  opportunityId: string;
  subjectId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-1">
        <Label htmlFor="rating">Rating (1–5)</Label>
        <Select
          id="rating"
          name="rating"
          defaultValue="5"
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${(n as number) > 1 ? "stars" : "star"}` }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="comment">Review</Label>
        <Textarea id="comment" name="comment" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Star className="h-4 w-4" aria-hidden="true" />
        )}
        Submit review
      </Button>
    </form>
  );
}

export function RaiseDisputeForm({ connectionId }: { connectionId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs"
      >
        Raise Dispute
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-rose-900">
          Raise Connection Dispute
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-rose-800">
        Raising a dispute will immediately put all pending escrow payouts on hold. An administrator will review your evidence and claims to resolve the matter.
      </p>

      <form
        action={(formData) => {
          startTransition(async () => {
            const { raiseDisputeAction } = await import("@/app/actions/disputes");
            await raiseDisputeAction(formData);
            setOpen(false);
            router.refresh();
          });
        }}
        className="space-y-3"
      >
        <input type="hidden" name="connectionId" value={connectionId} />

        <div className="space-y-1">
          <Label htmlFor="reason" className="text-xs text-foreground">
            Reason for Dispute *
          </Label>
          <Input
            id="reason"
            name="reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Failure to attend meeting, unverified contact, breach of agreed terms"
            className="text-xs bg-white"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs text-foreground">
            Detailed Description
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context on what occurred and what outcome you seek..."
            className="text-xs bg-white"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="evidence" className="text-xs text-foreground">
            Evidence / Supporting Reference
          </Label>
          <Input
            id="evidence"
            name="evidence"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Link to screenshots, email threads, or notes"
            className="text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirm & Freeze Escrow
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
