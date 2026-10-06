"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createCommentRevision,
  createNotification,
  createProgressComment,
  createProgressReport,
  getCommentById,
  getConnectionById,
  getDeadlineByConnection,
  getOpportunityById,
  getProgressReportById,
  updateProgressComment,
} from "@/lib/queries";
import { CONNECTION_CLOSED_STATUSES } from "@/lib/status";

export type ProgressState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

const ReportSchema = z.object({
  body: z.string().min(3, "Please describe the progress.").max(5000),
  status: z.enum(["ON_TRACK", "AT_RISK", "BLOCKED", "COMPLETE"]),
  milestone: z.coerce.number().min(0).max(100).optional(),
  revisedDeadline: z.string().optional().or(z.literal("")),
});

const CommentSchema = z.object({
  body: z.string().min(1, "Please write a comment.").max(5000),
});

const EditSchema = z.object({
  body: z.string().min(1, "A comment cannot be empty.").max(5000),
});

/**
 * Statuses in which the thread is closed. The progress report thread runs
 * "until the deadline ends" (§5.6.2), so once the Opportunity is finished the
 * record becomes read-only evidence.
 *
 * Sourced from the shared connection state machine in `lib/status.ts` — this
 * file previously carried its own copy of the list.
 */
const CLOSED_STATES = CONNECTION_CLOSED_STATUSES as readonly string[];

/**
 * Is the progress report thread currently open for this connection?
 * The thread opens when the Seeker accepts the deadline and closes when the
 * deadline ends (or the connection is otherwise closed).
 */
async function threadOpenFor(connectionId: string): Promise<
  { ok: true; conn: NonNullable<Awaited<ReturnType<typeof getConnectionById>>> } |
  { ok: false; error: string }
> {
  const conn = await getConnectionById(connectionId);
  if (!conn) return { ok: false, error: "Connection not found." };
  if (CLOSED_STATES.includes(conn.status)) {
    return { ok: false, error: "The progress report thread has ended." };
  }

  const deadline = await getDeadlineByConnection(connectionId);
  if (!deadline || deadline.status !== "ACCEPTED") {
    return {
      ok: false,
      error: "The thread opens once the Seeker accepts the task deadline.",
    };
  }
  return { ok: true, conn };
}

/**
 * Linker posts a progress report (§5.6.2). This is the Linker's reporting
 * obligation and the primary contemporaneous record of the engagement.
 */
export async function postProgressReportAction(
  prevState: ProgressState | undefined,
  formData: FormData
): Promise<ProgressState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const gate = await threadOpenFor(connectionId);
  if (!gate.ok) return { error: gate.error };
  const conn = gate.conn;

  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker posts progress reports." };
  }

  const parsed = ReportSchema.safeParse({
    body: String(formData.get("body") || ""),
    status: String(formData.get("status") || "ON_TRACK"),
    milestone: formData.get("milestone") || undefined,
    revisedDeadline: String(formData.get("revisedDeadline") || ""),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createProgressReport({
      connection_id: conn.id,
      author_id: user.id,
      body: parsed.data.body,
      status: parsed.data.status,
      milestone: parsed.data.milestone ?? null,
      revised_deadline: parsed.data.revisedDeadline
        ? new Date(parsed.data.revisedDeadline).toISOString()
        : null,
    });

    const opp = await getOpportunityById(conn.opportunity_id);
    if (opp) {
      try {
        await createNotification({
          user_id: opp.seeker_id,
          type: "PROGRESS_REPORT_POSTED",
          title: "New progress report",
          body: parsed.data.body.slice(0, 140),
          channel: "IN_APP",
          data: { connectionId: conn.id, opportunityId: opp.id },
        });
      } catch (e) {
        console.error("postProgressReportAction: notification failed", e);
      }
    }

    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("postProgressReportAction error", e);
    return { error: "Could not post the progress report." };
  }
}

/**
 * Linker or Seeker comments on a progress report (§5.6.2). Comments form a
 * thread attached to the report and are an equal part of the evidence of record.
 */
export async function postProgressCommentAction(
  prevState: ProgressState | undefined,
  formData: FormData
): Promise<ProgressState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const reportId = String(formData.get("reportId") || "");
  const report = reportId ? await getProgressReportById(reportId) : null;
  if (!report) return { error: "Progress report not found." };

  const gate = await threadOpenFor(report.connection_id);
  if (!gate.ok) return { error: gate.error };
  const conn = gate.conn;

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  const isLinker = conn.linker_id === user.id;
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) {
    return { error: "You are not part of this connection." };
  }

  const parsed = CommentSchema.safeParse({
    body: String(formData.get("body") || ""),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createProgressComment({
      report_id: report.id,
      author_id: user.id,
      author_role: isLinker ? "LINKER" : "SEEKER",
      body: parsed.data.body,
    });

    // Notify the counterparty.
    const recipient = isLinker ? opp.seeker_id : conn.linker_id;
    try {
      await createNotification({
        user_id: recipient,
        type: "PROGRESS_COMMENT_POSTED",
        title: "New comment on a progress report",
        body: parsed.data.body.slice(0, 140),
        channel: "IN_APP",
        data: { connectionId: conn.id, reportId: report.id },
      });
    } catch (e) {
      console.error("postProgressCommentAction: notification failed", e);
    }

    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("postProgressCommentAction error", e);
    return { error: "Could not post the comment." };
  }
}

/**
 * Edit an existing comment (§5.6.2).
 *
 * Both the Linker and the Seeker may edit THEIR OWN comment — but the previous
 * version is preserved as update history first. Nothing a party previously wrote
 * is ever destroyed, so a dispute (§9.11.1) can be resolved on what was actually
 * claimed and when, including any change of position between versions.
 */
export async function editProgressCommentAction(
  prevState: ProgressState | undefined,
  formData: FormData
): Promise<ProgressState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const commentId = String(formData.get("commentId") || "");
  const comment = commentId ? await getCommentById(commentId) : null;
  if (!comment) return { error: "Comment not found." };

  if (comment.author_id !== user.id) {
    return { error: "You can only edit your own comment." };
  }

  const report = await getProgressReportById(comment.report_id);
  if (!report) return { error: "Progress report not found." };

  const gate = await threadOpenFor(report.connection_id);
  if (!gate.ok) return { error: gate.error };
  const conn = gate.conn;

  const parsed = EditSchema.safeParse({
    body: String(formData.get("body") || ""),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.body.trim() === comment.body.trim()) {
    return { error: "The comment is unchanged." };
  }

  try {
    // 1. Preserve the CURRENT body as a revision BEFORE overwriting it. This is
    //    the step that makes the edit evidence-bearing — order matters.
    const nextRevision = (comment.revision_count ?? 0) + 1;
    await createCommentRevision({
      comment_id: comment.id,
      body: comment.body,
      revision_number: nextRevision,
      edited_by_id: user.id,
      edited_at: new Date().toISOString(),
    });

    // 2. Apply the edit and bump the visible revision markers.
    await updateProgressComment(comment.id, {
      body: parsed.data.body,
      edited: true,
      revision_count: nextRevision,
    });

    const opp = await getOpportunityById(conn.opportunity_id);
    if (opp) {
      const recipient =
        comment.author_role === "LINKER" ? opp.seeker_id : conn.linker_id;
      try {
        await createNotification({
          user_id: recipient,
          type: "PROGRESS_COMMENT_EDITED",
          title: "A comment on a progress report was edited",
          body: "The previous version is preserved in the update history.",
          channel: "IN_APP",
          data: { connectionId: conn.id, commentId: comment.id },
        });
      } catch (e) {
        console.error("editProgressCommentAction: notification failed", e);
      }
    }

    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("editProgressCommentAction error", e);
    return { error: "Could not edit the comment." };
  }
}
