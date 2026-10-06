import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, MessageSquare, Flag, History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionsByUser,
  getDeadlineByConnection,
  getActiveFlagByConnection,
  getProgressReportsByConnection,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";
import type { ConnectionRow, OpportunityDeadlineRow } from "@/lib/jomlink-types";

export const metadata = { title: "Connections · Jomlink" };

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
};

const CLOSED = ["COMPLETED", "FAILED", "DISPUTED"];

/**
 * What does THIS member need to do next on this connection?
 *
 * Returned as a short prompt + action label so the Linker (who owns the deadline
 * request and the progress reports) can see at a glance what needs doing without
 * having to open every connection first.
 */
function nextAction(
  conn: ConnectionRow,
  isLinker: boolean,
  deadline: OpportunityDeadlineRow | null,
  flagged: boolean
): { prompt: string; action: string; href: string } | null {
  const closed = CLOSED.includes(conn.status);

  if (isLinker) {
    if (!deadline) {
      return {
        prompt: "Set the task deadline for this job.",
        action: "Set deadline",
        href: `/dashboard/connections/${conn.id}`,
      };
    }
    if (deadline.status === "REQUESTED") {
      return {
        prompt: "Waiting for the Seeker to accept your proposed deadline.",
        action: "View",
        href: `/dashboard/connections/${conn.id}`,
      };
    }
    if (deadline.status === "REJECTED") {
      return {
        prompt: "Your deadline was rejected — propose a new one.",
        action: "Propose deadline",
        href: `/dashboard/connections/${conn.id}`,
      };
    }
    if (deadline.status === "ACCEPTED" && !closed) {
      return {
        prompt: flagged
          ? "You missed a deadline. Post an update or deliver the task."
          : "Post a progress update on the job.",
        action: "Update progress",
        href: `/dashboard/connections/${conn.id}/progress`,
      };
    }
    return null;
  }

  // Seeker
  if (deadline && deadline.status === "REQUESTED") {
    return {
      prompt: "The Linker proposed a deadline — accept it or request a change.",
      action: "Review deadline",
      href: `/dashboard/connections/${conn.id}`,
    };
  }
  if (deadline && deadline.status === "ACCEPTED" && !closed) {
    return {
      prompt: flagged
        ? "The Linker missed a deadline — review the commitment flag."
        : "Review the Linker's latest progress report.",
      action: "View progress",
      href: `/dashboard/connections/${conn.id}/progress`,
    };
  }
  return null;
}

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const connections = await getConnectionsByUser(user.id);

  // Resolve role + deadline + flag per connection so each member sees their own
  // next step without having to open the connection first.
  const enriched = await Promise.all(
    (connections as (ConnectionRow & { opportunities?: unknown })[]).map(
      async (c) => {
        const opp = c.opportunities as { seeker_id?: string } | null;
        const isLinker = c.linker_id === user.id;
        const isSeeker = opp?.seeker_id === user.id;
        const [deadline, flag, reports] = await Promise.all([
          getDeadlineByConnection(c.id),
          getActiveFlagByConnection(c.id),
          getProgressReportsByConnection(c.id),
        ]);
        return {
          conn: c,
          isLinker,
          deadline,
          flagged: !!flag,
          reportCount: reports.length,
          next:
            isLinker || isSeeker
              ? nextAction(c, isLinker, deadline, !!flag)
              : null,
          // The thread opens once the deadline is accepted and stays reachable
          // until the connection closes — independent of nextAction, which only
          // surfaces it in the ACCEPTED state.
          progressHref:
            (isLinker || isSeeker) &&
            deadline &&
            (deadline as OpportunityDeadlineRow).status === "ACCEPTED" &&
            !CLOSED.includes(c.status)
              ? `/dashboard/connections/${c.id}/progress`
              : null,
        };
      }
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="mt-1 text-muted-foreground">
          Active and past introductions you are involved in.
        </p>
      </div>

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Handshake className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              No connections yet. They appear once a Seeker selects your proposal.
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enriched.map(
            ({ conn: c, isLinker, deadline, flagged, reportCount, next, progressHref }) => {
              const opp = c.opportunities as { title?: string } | null;
              return (
                <Card key={c.id} className={flagged ? "border-amber-300" : undefined}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{opp?.title ?? "Opportunity"}</p>
                        {flagged && (
                          <Badge variant="warning" className="text-[10px]">
                            <Flag className="h-3 w-3" aria-hidden="true" /> Missed deadline
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {isLinker ? "You are the Linker" : "You are the Seeker"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Started {formatDate(c.created_at)}
                        {deadline
                          ? ` · Deadline ${formatDate(
                              (deadline as OpportunityDeadlineRow).proposed_date
                            )} (${(deadline as OpportunityDeadlineRow).status.toLowerCase()})`
                          : " · No deadline set yet"}
                        {reportCount > 0
                          ? ` · ${reportCount} progress report(s)`
                          : ""}
                      </p>
                      {next && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          {next.prompt}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={c.status === "COMPLETED" ? "success" : "secondary"}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                      {/* Only show the standalone thread link when the primary
                          action isn't already pointing at the progress thread
                          (nextAction returns it in the ACCEPTED state). */}
                      {progressHref && next?.href !== progressHref && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={progressHref}>
                            <History className="h-3.5 w-3.5" aria-hidden="true" />
                            Progress
                          </Link>
                        </Button>
                      )}
                      {next ? (
                        <Button asChild size="sm">
                          <Link href={next.href}>{next.action}</Link>
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm">
                          <Link href={"/dashboard/connections/" + c.id}>Open</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}