import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  MessageSquare,
  History,
  Flag,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { getDisputeById, getEvidenceOfRecord } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import type {
  OpportunityDeadlineRow,
  LinkerFlagRow,
  ProgressReportCommentRevisionRow,
} from "@/lib/jomlink-types";

export const metadata = { title: "Dispute · Admin · Jomlink" };

const DEADLINE_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested (awaiting Seeker)",
  ACCEPTED: "Accepted — official deadline",
  REJECTED: "Rejected — terms reopened",
  SUPERSEDED: "Superseded",
};

const REPORT_STATUS_LABEL: Record<string, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
  COMPLETE: "Complete",
};

/**
 * Dispute detail — the Evidence of Record (blueprint §9.11, §9.11.1).
 *
 * A resolution must rest on what was actually claimed, by whom, and when. This
 * screen shows the deadline record, the full progress report thread, and every
 * edited comment's prior versions — because a comment's current text alone is
 * not sufficient evidence.
 */
export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("disputes:read");
  const { id } = await params;

  const dispute = await getDisputeById(id);
  if (!dispute) notFound();

  const record: Awaited<ReturnType<typeof getEvidenceOfRecord>> =
    dispute.connection_id
      ? await getEvidenceOfRecord(dispute.connection_id)
      : { deadline: null, reports: [], flags: [] };

  const { deadline, reports, flags } = record;
  const totalRevisions = reports.reduce(
    (sum, r) => sum + r.comments.reduce((s, c) => s + c.revisions.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to disputes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {dispute.opportunities?.title ?? "Dispute"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raised {formatDate(dispute.created_at)} · Status {dispute.status}
          </p>
        </div>
        <Badge
          variant={
            dispute.status === "RESOLVED"
              ? "success"
              : dispute.status === "OPEN"
                ? "destructive"
                : "warning"
          }
        >
          {dispute.status}
        </Badge>
      </div>

      {/* The claim */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" /> Claim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">Reason:</span> {dispute.reason}
          </p>
          {dispute.description && (
            <p className="text-muted-foreground">{dispute.description}</p>
          )}
          {dispute.evidence && (
            <p className="text-muted-foreground">
              <span className="font-semibold">Evidence submitted:</span>{" "}
              {dispute.evidence}
            </p>
          )}
          {dispute.resolution_note && (
            <p className="rounded-md border border-border bg-muted p-2 text-muted-foreground">
              <span className="font-semibold">Resolution:</span>{" "}
              {dispute.resolution_note}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Evidence of record summary */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">
          <CalendarClock className="h-3 w-3" aria-hidden="true" /> Deadline record:{" "}
          {deadline ? "present" : "none"}
        </Badge>
        <Badge variant="outline">
          <MessageSquare className="h-3 w-3" aria-hidden="true" /> Progress reports:{" "}
          {reports.length}
        </Badge>
        <Badge variant="outline">
          <History className="h-3 w-3" aria-hidden="true" /> Kept revisions:{" "}
          {totalRevisions}
        </Badge>
        <Badge variant={flags.length ? "warning" : "outline"}>
          <Flag className="h-3 w-3" aria-hidden="true" /> Flags: {flags.length}
        </Badge>
      </div>

      {/* 1. Deadline record (§5.6.1) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" /> Deadline
            Record
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {deadline ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Proposed deadline</dt>
                <dd className="font-semibold">
                  {formatDate((deadline as OpportunityDeadlineRow).proposed_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  {DEADLINE_STATUS_LABEL[(deadline as OpportunityDeadlineRow).status] ??
                    (deadline as OpportunityDeadlineRow).status}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deliverable</dt>
                <dd>{(deadline as OpportunityDeadlineRow).deliverable ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responded</dt>
                <dd>
                  {(deadline as OpportunityDeadlineRow).responded_at
                    ? formatDate((deadline as OpportunityDeadlineRow).responded_at!)
                    : "—"}
                </dd>
              </div>
              {(deadline as OpportunityDeadlineRow).rejection_reason && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Rejection reason</dt>
                  <dd className="text-destructive">
                    {(deadline as OpportunityDeadlineRow).rejection_reason}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground">
              No deadline was recorded for this connection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Flags (§5.6.1) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-amber-600" aria-hidden="true" /> Commitment
            Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {flags.length === 0 ? (
            <p className="text-muted-foreground">No flags were raised.</p>
          ) : (
            <ul className="space-y-2">
              {(flags as LinkerFlagRow[]).map((f) => (
                <li key={f.id} className="rounded-md border border-border bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {f.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <Badge variant={f.status === "RAISED" ? "warning" : "success"}>
                      {f.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{f.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Raised {formatDate(f.raised_at)}
                    {f.cleared_at
                      ? ` · Cleared ${formatDate(f.cleared_at)} (${f.cleared_reason ?? "resolved"})`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 3. Progress report thread + comment revisions (§5.6.2, §9.11.1) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Progress
            Report Thread (evidence of record)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {reports.length === 0 ? (
            <p className="text-muted-foreground">
              No progress reports were posted for this connection.
            </p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {r.milestone !== null ? `${r.milestone}% · ` : ""}
                    {REPORT_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{r.body}</p>

                {r.comments.length > 0 && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {r.comments.map((c) => (
                      <div key={c.id} className="rounded bg-muted p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold">
                            {c.author_role}
                          </span>
                          {c.edited && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                              edited · {c.revision_count} revision(s) kept
                            </span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{c.body}</p>

                        {c.revisions.length > 0 && (
                          <div className="mt-2 border-l-2 border-amber-300 pl-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Update history
                            </p>
                            <ul className="mt-1 space-y-1.5">
                              {c.revisions.map(
                                (rev: ProgressReportCommentRevisionRow) => (
                                  <li key={rev.id} className="text-xs">
                                    <span className="text-muted-foreground">
                                      Version {rev.revision_number} ·{" "}
                                      {formatDate(rev.edited_at)}
                                    </span>
                                    <p className="whitespace-pre-wrap">{rev.body}</p>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
