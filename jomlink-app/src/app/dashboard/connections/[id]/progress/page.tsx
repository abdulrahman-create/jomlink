import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  getOpportunityById,
  getDeadlineByConnection,
  getActiveFlagByConnection,
  getProgressReportsByConnection,
  getCommentsByReport,
  getRevisionsByComment,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import type {
  ProgressReportRow,
  ProgressReportCommentRow,
  ProgressReportCommentRevisionRow,
  OpportunityDeadlineRow,
  LinkerFlagRow,
} from "@/lib/jomlink-types";
import {
  PostProgressReport,
  PostProgressComment,
  EditProgressComment,
  YellowFlagBanner,
} from "../deadline-actions";

export const metadata = { title: "Progress Reports · Jomlink" };

const REPORT_STATUS_LABEL: Record<string, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
  COMPLETE: "Complete",
};

function reportVariant(status: string) {
  if (status === "COMPLETE") return "success" as const;
  if (status === "AT_RISK" || status === "BLOCKED") return "warning" as const;
  return "secondary" as const;
}

/**
 * The progress report thread (blueprint §5.6.2).
 *
 * Runs from deadline acceptance until the deadline ends. The Linker posts
 * reports; both parties comment. Comment edits keep the previous wording as
 * update history, so the thread is a permanent evidence of record (§9.11.1).
 */
export default async function ProgressThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conn = await getConnectionById(id);
  if (!conn) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) redirect("/dashboard");

  const isLinker = conn.linker_id === user.id;
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) redirect("/dashboard");

  const [deadline, flag, reports] = await Promise.all([
    getDeadlineByConnection(conn.id),
    getActiveFlagByConnection(conn.id),
    getProgressReportsByConnection(conn.id),
  ]);

  // Hydrate comments + their immutable revision history per report.
  const withComments = await Promise.all(
    (reports as ProgressReportRow[]).map(async (r) => {
      const comments = (await getCommentsByReport(r.id)) as ProgressReportCommentRow[];
      const hydrated = await Promise.all(
        comments.map(async (c) => ({
          ...c,
          revisions: c.edited
            ? ((await getRevisionsByComment(
                c.id
              )) as ProgressReportCommentRevisionRow[])
            : [],
        }))
      );
      return { ...r, comments: hydrated };
    })
  );

  const threadEnded = ["COMPLETED", "FAILED", "DISPUTED"].includes(conn.status);
  const deadlineAccepted =
    deadline && (deadline as OpportunityDeadlineRow).status === "ACCEPTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href={`/dashboard/connections/${conn.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to connection
        </Link>
        <Link
          href="/dashboard/connections"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          All connections
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress Reports</h1>
        <p className="mt-1 text-muted-foreground">
          {opp.title} · You are the {isLinker ? "Linker" : "Seeker"}
        </p>
      </div>

      {flag && <YellowFlagBanner reason={(flag as LinkerFlagRow).reason} />}

      {!deadlineAccepted ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            The thread opens once the Seeker accepts the task deadline.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {threadEnded
                  ? "Thread closed — retained as evidence of record"
                  : "Thread open until the deadline ends"}
              </CardTitle>
            </CardHeader>
            {!threadEnded && isLinker && (
              <CardContent>
                <PostProgressReport connectionId={conn.id} />
              </CardContent>
            )}
          </Card>

          {withComments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No progress reports yet.
              </CardContent>
            </Card>
          ) : (
            withComments.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {r.milestone !== null ? `${r.milestone}% · ` : ""}
                      {REPORT_STATUS_LABEL[r.status] ?? r.status}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={reportVariant(r.status)}>
                        {REPORT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  {r.revised_deadline && (
                    <p className="text-xs text-muted-foreground">
                      Revised estimate: {formatDate(r.revised_deadline)}
                    </p>
                  )}

                  {/* Comments */}
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comments ({r.comments?.length ?? 0})
                    </p>
                    {(r.comments ?? []).map((c) => {
                      const mine = c.author_id === user.id;
                      return (
                        <div
                          key={c.id}
                          className="rounded-md border border-border bg-muted p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold">
                              {c.author_role === "LINKER" ? "Linker" : "Seeker"}
                              {mine ? " (you)" : ""}
                            </span>
                            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {c.edited && (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <History className="h-3 w-3" aria-hidden="true" />
                                  edited · {c.revision_count} revision
                                  {c.revision_count === 1 ? "" : "s"} kept
                                </span>
                              )}
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap">{c.body}</p>

                          {/* Update history — prior versions, oldest first */}
                          {c.revisions && c.revisions.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-primary">
                                View update history ({c.revisions.length})
                              </summary>
                              <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
                                {c.revisions.map((rev) => (
                                  <li key={rev.id} className="text-xs">
                                    <span className="text-muted-foreground">
                                      Version {rev.revision_number} ·{" "}
                                      {formatDate(rev.edited_at)}
                                    </span>
                                    <p className="mt-0.5 whitespace-pre-wrap">
                                      {rev.body}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {!threadEnded && mine && (
                            <div className="mt-2">
                              <EditProgressComment
                                commentId={c.id}
                                currentBody={c.body}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!threadEnded && <PostProgressComment reportId={r.id} />}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
