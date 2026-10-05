"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CalendarClock,
  CheckCircle2,
  X,
  Flag,
  ShieldCheck,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  requestDeadlineAction,
  acceptDeadlineAction,
  rejectDeadlineAction,
  type DeadlineState,
} from "@/app/actions/deadlines";
import {
  postProgressReportAction,
  postProgressCommentAction,
  editProgressCommentAction,
  type ProgressState,
} from "@/app/actions/progress-reports";

const empty: DeadlineState = {};

/** Linker requests the task deadline (blueprint §5.6.1, Step 1). */
export function RequestDeadline({
  connectionId,
  defaultDeliverable,
}: {
  connectionId: string;
  defaultDeliverable?: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DeadlineState, FormData>(
    requestDeadlineAction,
    empty
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-3 space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      <p className="text-xs text-muted-foreground">
        Propose the date by which you will deliver the agreed task. It becomes
        official once the Seeker accepts it.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="proposedDate">Task deadline</Label>
          <Input id="proposedDate" name="proposedDate" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="deliverable">Deliverable</Label>
          <Input
            id="deliverable"
            name="deliverable"
            defaultValue={defaultDeliverable ?? ""}
            placeholder="What you will deliver"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>
      {state?.fieldErrors?.proposedDate && (
        <p className="text-sm text-destructive">{state.fieldErrors.proposedDate[0]}</p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        )}
        Request deadline
      </Button>
    </form>
  );
}

/** Seeker accepts or rejects the proposed deadline (blueprint §5.6.1, Step 2). */
export function DeadlineActions({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DeadlineState, FormData>(
    acceptDeadlineAction,
    empty
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<
    DeadlineState,
    FormData
  >(rejectDeadlineAction, empty);
  const [showReject, setShowReject] = React.useState(false);

  useEffect(() => {
    if (state?.success || rejectState?.success) router.refresh();
  }, [state, rejectState, router]);

  return (
    <div className="mt-3 space-y-3">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {rejectState?.error && (
        <p className="text-sm text-destructive">{rejectState.error}</p>
      )}

      {!showReject ? (
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="connectionId" value={connectionId} />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Accept deadline
            </Button>
          </form>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowReject(true)}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Request a change
          </Button>
        </div>
      ) : (
        <form action={rejectAction} className="space-y-2 rounded-md border border-border p-3">
          <input type="hidden" name="connectionId" value={connectionId} />
          <p className="text-xs text-muted-foreground">
            Rejecting reopens the terms for negotiation. No deadline is official
            until you accept a revised one.
          </p>
          <div className="space-y-1">
            <Label htmlFor="rejectionReason">Reason</Label>
            <Textarea
              id="rejectionReason"
              name="rejectionReason"
              rows={2}
              required
              placeholder="e.g. The date is too late for our schedule."
            />
          </div>
          {rejectState?.fieldErrors?.rejectionReason && (
            <p className="text-sm text-destructive">
              {rejectState.fieldErrors.rejectionReason[0]}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="destructive" disabled={rejectPending}>
              {rejectPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              Reject deadline
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowReject(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** A prominent banner for the Linker's yellow flag (blueprint §5.6.1). */
export function YellowFlagBanner({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950">
      <div className="flex items-center gap-2 font-semibold">
        <Flag className="h-5 w-5 text-amber-600" aria-hidden="true" />
        Yellow flag — missed commitment
      </div>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">
        {reason ??
          "The Linker did not deliver the agreed task by the deadline they proposed."}{" "}
        This is a commitment signal, not a penalty. The flag clears automatically
        once the task is delivered or an extension is accepted.
      </p>
    </div>
  );
}

/** Linker posts a progress report (blueprint §5.6.2). */
export function PostProgressReport({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProgressState, FormData>(
    postProgressReportAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-1">
        <Label htmlFor="body">Progress update</Label>
        <Textarea
          id="body"
          name="body"
          rows={3}
          required
          placeholder="What has progressed since your last report?"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="ON_TRACK">
            <option value="ON_TRACK">On track</option>
            <option value="AT_RISK">At risk</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETE">Complete</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="milestone">Milestone %</Label>
          <Input
            id="milestone"
            name="milestone"
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 60"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="revisedDeadline">Revised estimate</Label>
          <Input id="revisedDeadline" name="revisedDeadline" type="date" />
        </div>
      </div>
      {state?.fieldErrors?.body && (
        <p className="text-sm text-destructive">{state.fieldErrors.body[0]}</p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        )}
        Post progress report
      </Button>
    </form>
  );
}

/** Comment on a progress report — both parties may comment (§5.6.2). */
export function PostProgressComment({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProgressState, FormData>(
    postProgressCommentAction,
    {}
  );
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="reportId" value={reportId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Textarea
        name="body"
        rows={2}
        required
        placeholder="Add a comment on this report…"
        aria-label="Comment on this progress report"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        )}
        Comment
      </Button>
    </form>
  );
}

/**
 * Edit one of your own comments. The previous version is preserved as update
 * history before the edit lands — nothing is ever destroyed (§5.6.2).
 */
export function EditProgressComment({
  commentId,
  currentBody,
}: {
  commentId: string;
  currentBody: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<ProgressState, FormData>(
    editProgressCommentAction,
    {}
  );

  // Collapse the editor once the edit succeeds. Keyed on the action result so
  // we never call setState synchronously inside an effect.
  const succeeded = state?.success === true;
  const [seenSuccess, setSeenSuccess] = React.useState(false);
  if (succeeded && !seenSuccess) {
    setSeenSuccess(true);
    if (open) setOpen(false);
  }
  React.useEffect(() => {
    if (succeeded) router.refresh();
  }, [succeeded, router]);

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-xs"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
      </Button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="commentId" value={commentId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Textarea name="body" rows={2} defaultValue={currentBody} required />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
          Save edit
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <span className="text-xs text-muted-foreground">
          The previous version is kept as update history.
        </span>
      </div>
    </form>
  );
}
