import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ClipboardCheck, Sparkles, Scale, CalendarClock, MessageSquare, Paperclip, Clock, History, AlertTriangle, Wallet, Coins } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  getOpportunityById,
  getAppointmentsByConnection,
  getEvidenceByConnection,
  getReviewsForSubject,
  getReviewByAuthorAndOpportunity,
  getDisputeByConnectionId,
  getDeadlineByConnection,
  getActiveFlagByConnection,
  getProgressReportsByConnection,
  getOpenExtensionByConnection,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMYR, FEES } from "@/lib/constants";
import { computeFunding } from "@/lib/funding";
import { isConnectionOpen } from "@/lib/status";
import { deadlineProximity, daysUntil } from "@/lib/deadline-warnings";
import type { AppointmentRow, ConnectionEvidenceRow, ReviewRow, OpportunityDeadlineRow, LinkerFlagRow, ProgressReportRow } from "@/lib/jomlink-types";
import {
  ProposeAppointment,
  AppointmentActions,
  SubmitEvidence,
  CompleteConnection,
  ExtensionForm,
  ExtensionDecision,
  MarkFailed,
  ReviewForm,
  RaiseDisputeForm,
} from "./actions";
import { RequestDeadline, DeadlineActions, YellowFlagBanner } from "./deadline-actions";

export const metadata = { title: "Connection · Jomlink" };

const CONN_STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  EVIDENCE_SUBMITTED: "Evidence submitted",
  AWAITING_SEEKER_CONFIRMATION: "Awaiting your confirmation",
  AWAITING_VERIFICATION: "Awaiting verification",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
};

const DEADLINE_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Awaiting your acceptance",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected — terms reopened",
  SUPERSEDED: "Superseded",
};

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conn = await getConnectionById(id);
  if (!conn) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isLinker = conn.linker_id === user.id;
  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) redirect("/dashboard");
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) redirect("/dashboard");

  const counterpartyId = isSeeker ? conn.linker_id : opp.seeker_id;

  const [appointments, evidence, dispute, deadline, flag, reports, myReview, theirReviews, openExtension] =
    await Promise.all([
      getAppointmentsByConnection(conn.id),
      getEvidenceByConnection(conn.id),
      getDisputeByConnectionId(conn.id),
      getDeadlineByConnection(conn.id),
      getActiveFlagByConnection(conn.id),
      getProgressReportsByConnection(conn.id),
      // Reviews are one-per-(author, opportunity): `myReview` gates the form so
      // it disappears after the member has reviewed, and `theirReviews` powers
      // the counterparty's rating summary on this page.
      getReviewByAuthorAndOpportunity(user.id, opp.id),
      getReviewsForSubject(counterpartyId),
      // A pending extension request (§5.14). The Linker sees that it is awaiting
      // a decision; the Seeker sees the accept/reject controls.
      getOpenExtensionByConnection(conn.id),
    ]);

  const latestAppointment = (appointments as AppointmentRow[])[
    (appointments as AppointmentRow[]).length - 1
  ] ?? null;

  // Running out of time? The deadline is close but the work is still open and
  // not marked complete — warn both parties before the slot passes (§5.6.1).
  const hasCompleteReport = (reports as ProgressReportRow[]).some(
    (r) => r.status === "COMPLETE"
  );
  const proximity = deadlineProximity(deadline as OpportunityDeadlineRow | null);
  const ranOutOfTime =
    isConnectionOpen(conn.status) &&
    !hasCompleteReport &&
    (proximity === "SOON" || proximity === "URGENT");
  const daysLeft =
    (deadline as OpportunityDeadlineRow | null)?.accepted_date
      ? daysUntil((deadline as OpportunityDeadlineRow).accepted_date!)
      : null;

  // ── Reward & payout (what the Linker receives, and when) ────────────────────
  // The reward is settled from the Seeker's wallet into escrow when a Linker is
  // selected (`agreed_reward`, falling back to the opportunity's advertised
  // reward). The Linker is paid this reward less the platform service fee, and
  // the release happens IMMEDIATELY when the Seeker marks the connection
  // complete (Option A). The 7-day window (`auto_release_at`) is only a fallback
  // safety net for a completed-but-unreleased connection. This card makes both
  // figures concrete so the Linker always knows their take-home and the date a
  // fallback payout would land — not just that "escrow" exists.
  const rewardAmount = Number(conn.agreed_reward ?? opp.offer_amount ?? 0);
  const funding = computeFunding(rewardAmount);
  const serviceFeeRatePct = Math.round(FEES.LINKER_SERVICE_FEE_RATE * 100);

  // Where is the money in its lifecycle?
  //   RELEASED / REFUNDED → the escrow has already left the holding account
  //                         (paid to the Linker, or returned to the Seeker).
  //   HELD / DISPUTED     → frozen by an open dispute.
  //   FAILED / VOID       → the job failed; the reward is refunded, not paid.
  //   else                → still held; `auto_release_at` (set at completion)
  //                         is the FALLBACK date the safety-net sweep would pay.
  const releaseStatus = (conn.release_status ?? "").toUpperCase();
  const released = releaseStatus === "RELEASED";
  const refunded = releaseStatus === "REFUNDED" || releaseStatus === "VOID";
  const disputed = conn.status === "DISPUTED" || releaseStatus === "HELD";
  const failed = conn.status === "FAILED";
  const releaseDate = conn.auto_release_at ? formatDate(conn.auto_release_at) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/connections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to connections
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{opp.title}</h1>
          <p className="mt-1 text-muted-foreground">
            You are the {isLinker ? "Linker" : "Seeker"} ·{" "}
            {CONN_STATUS_LABEL[conn.status] ?? conn.status}
          </p>
        </div>
        <Badge variant={conn.status === "COMPLETED" ? "success" : "secondary"}>
          {conn.status}
        </Badge>
      </div>

      {/* Reward & payout — what the Linker will receive, and the date it lands.
          The reward is settled into escrow on selection and paid out on verified
          completion, less the platform service fee. Surfacing the net figure and
          the release date here means neither side has to guess. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" /> Reward &amp; payout
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reward held in escrow
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {formatMYR(funding.reward)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Funded by the Seeker when a Linker is selected.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isLinker ? "You receive" : "Linker receives"}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                {formatMYR(funding.linkerPayout)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                After the {serviceFeeRatePct}% service fee (
                {formatMYR(funding.linkerServiceFee)}).
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
            <Coins className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="text-xs">
              {failed || refunded ? (
                <>
                  <p className="font-semibold text-foreground">
                    This connection did not complete
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    The reward is refunded to the Seeker, not paid out to the
                    Linker.
                  </p>
                </>
              ) : released ? (
                <>
                  <p className="font-semibold text-foreground">
                    Paid — released to the Linker&apos;s wallet
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {formatMYR(funding.linkerPayout)} has settled into the wallet.
                    {releaseDate ? ` Released ${releaseDate}.` : ""}
                  </p>
                </>
              ) : disputed ? (
                <>
                  <p className="font-semibold text-foreground">
                    Payout on hold — dispute under review
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    The escrow is frozen while an administrator resolves the
                    dispute.
                  </p>
                </>
              ) : releaseDate ? (
                <>
                  <p className="font-semibold text-foreground">
                    Awaiting release
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    The {formatMYR(funding.linkerPayout)} releases to the
                    Linker&apos;s wallet as soon as the Seeker marks the work
                    complete. If it is not released, a safety net pays it out
                    automatically on {releaseDate}.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground">
                    Released on completion
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    The reward releases to the Linker&apos;s wallet as soon as
                    the Seeker marks the work complete. If it is not released, a{" "}
                    {FEES.RELEASE_WAIT_DAYS}-day safety net pays it out
                    automatically.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Alert Banner */}
      {(conn.status === "DISPUTED" || dispute) && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-4 text-rose-950">
          <div className="flex items-center gap-2 font-semibold">
            <Scale className="h-5 w-5 text-rose-600" />
            Connection Dispute Active · Payouts On Hold
          </div>
          <p className="mt-1 text-xs text-rose-800 leading-relaxed">
            A dispute has been raised on this connection. Pending reward escrow releases are frozen while an administrator investigates the claims and evidence.
          </p>
          {dispute && (
            <div className="mt-2 text-xs bg-white/60 p-2.5 rounded border border-rose-200">
              <span className="font-semibold text-rose-900">Reason:</span> {dispute.reason}
              {dispute.description && (
                <p className="mt-1 text-muted-foreground">{dispute.description}</p>
              )}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-rose-800">
                <span>Status: <strong className="uppercase">{dispute.status}</strong></span>
                <span>Submitted {formatDate(dispute.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yellow flag — missed commitment (blueprint §5.6.1) */}
      {flag && <YellowFlagBanner reason={(flag as LinkerFlagRow).reason} />}

      {/* Running out of time — deadline close, work not complete (§5.6.1) */}
      {ranOutOfTime && (
        <div
          className={
            proximity === "URGENT"
              ? "rounded-xl border border-destructive/50 bg-destructive-bg p-4 text-destructive"
              : "rounded-xl border border-warning/50 bg-warning-bg p-4 text-warning"
          }
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            {proximity === "URGENT"
              ? "Connection running out of time — deadline is nearly up"
              : "Connection running out of time"}
          </div>
          <p className="mt-1 text-xs leading-relaxed">
            The accepted deadline falls{" "}
            {daysLeft === null
              ? "very soon"
              : daysLeft <= 0
                ? "today"
                : daysLeft === 1
                  ? "tomorrow"
                  : `in ${daysLeft} days`}
            , and the work is not marked complete yet. Deliver the task, post a
            progress update, or request an extension before the deadline passes —
            otherwise a missed-commitment flag may be raised.
          </p>
        </div>
      )}

      {/* Deadline Setting (blueprint §5.6.1) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" /> Task Deadline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {deadline ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {formatDate((deadline as OpportunityDeadlineRow).proposed_date)}
                </p>
                <Badge
                  variant={
                    (deadline as OpportunityDeadlineRow).status === "ACCEPTED"
                      ? "success"
                      : (deadline as OpportunityDeadlineRow).status === "REJECTED"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {DEADLINE_STATUS_LABEL[(deadline as OpportunityDeadlineRow).status] ??
                    (deadline as OpportunityDeadlineRow).status}
                </Badge>
              </div>
              {(deadline as OpportunityDeadlineRow).deliverable && (
                <p className="text-muted-foreground">
                  Deliverable: {(deadline as OpportunityDeadlineRow).deliverable}
                </p>
              )}
              {(deadline as OpportunityDeadlineRow).note && (
                <p className="text-muted-foreground">
                  Note: {(deadline as OpportunityDeadlineRow).note}
                </p>
              )}
              {(deadline as OpportunityDeadlineRow).rejection_reason && (
                <p className="text-destructive">
                  Reason: {(deadline as OpportunityDeadlineRow).rejection_reason}
                </p>
              )}

              {/* Seeker decides on a pending request */}
              {isSeeker && (deadline as OpportunityDeadlineRow).status === "REQUESTED" && (
                <DeadlineActions connectionId={conn.id} />
              )}
              {/* Linker re-requests after a rejection (terms reopened) */}
              {isLinker && (deadline as OpportunityDeadlineRow).status === "REJECTED" && (
                <RequestDeadline
                  connectionId={conn.id}
                  defaultDeliverable={(deadline as OpportunityDeadlineRow).deliverable}
                />
              )}
            </div>
          ) : isLinker ? (
            <RequestDeadline
              connectionId={conn.id}
              defaultDeliverable={opp.required_outcome}
            />
          ) : (
            <p className="text-muted-foreground">
              The Linker will propose the task deadline. It becomes official once
              you accept it.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Progress Report Thread (blueprint §5.6.2) */}
      {deadline && (deadline as OpportunityDeadlineRow).status === "ACCEPTED" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Progress Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {(reports as ProgressReportRow[]).length} report(s) on the record.
              Both parties may comment; edits preserve the previous wording as
              update history.
            </p>
            {["COMPLETED", "FAILED", "DISPUTED"].includes(conn.status) ? (
              <p className="text-muted-foreground">
                The thread has ended.{" "}
                <Link
                  href={`/dashboard/connections/${conn.id}/progress`}
                  className="font-semibold text-primary hover:underline"
                >
                  View the report history
                </Link>
              </p>
            ) : (
              <Link
                href={`/dashboard/connections/${conn.id}/progress`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Open the progress report thread
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appointment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" /> Appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestAppointment ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">
                {formatDate(latestAppointment.date)}
                {latestAppointment.method ? ` · ${latestAppointment.method}` : ""}
              </p>
              {latestAppointment.location && (
                <p className="text-muted-foreground">Location: {latestAppointment.location}</p>
              )}
              {latestAppointment.target && (
                <p className="text-muted-foreground">Target: {latestAppointment.target}</p>
              )}
              {latestAppointment.remarks && (
                <p className="text-muted-foreground">Remarks: {latestAppointment.remarks}</p>
              )}
              <Badge variant="outline">{latestAppointment.status}</Badge>

              {isSeeker && latestAppointment.status === "PROPOSED" && (
                <AppointmentActions appointmentId={latestAppointment.id} />
              )}

              {/* Only the Linker opens the schedule. After a rejection they may
                  propose a fresh date so the connection always has a way forward. */}
              {isLinker &&
                latestAppointment.status === "REJECTED" &&
                (isConnectionOpen(conn.status) ? (
                  <div className="mt-2 rounded-md border border-dashed border-border p-3">
                    <p className="text-sm font-medium">
                      This slot was rejected. Propose a new date to keep things moving.
                    </p>
                    <ProposeAppointment
                      connectionId={conn.id}
                      withError={false}
                      submitLabel="Propose new date"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This connection is closed, so the schedule is final.
                  </p>
                ))}
            </div>
          ) : isLinker ? (
            isConnectionOpen(conn.status) ? (
              <ProposeAppointment connectionId={conn.id} withError={conn.status === "PENDING_ACKNOWLEDGEMENT"} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This connection is closed, so the schedule is final.
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              The Linker will propose an appointment.
            </p>
          )}

          {/* Track record — the full appointment history. Kept for both parties
              and any administrator: a disputed connection rests on who proposed
              what slot, when, and how the counterparty responded. */}
          {(appointments as AppointmentRow[]).length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <History className="h-4 w-4 text-primary" aria-hidden="true" />
                Appointment track record
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every proposed slot and its outcome, newest first. This record is
                retained as evidence for disputes and proof of delivery.
              </p>
              <ol className="mt-3 space-y-2">
                {[...(appointments as AppointmentRow[])].reverse().map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border border-border p-3 text-sm"
                  >
                    <span className="font-medium">
                      {formatDate(a.date)}
                      {a.method ? ` · ${a.method}` : ""}
                      {a.location ? ` · ${a.location}` : ""}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant={
                          a.status === "ACKNOWLEDGED"
                            ? "success"
                            : a.status === "REJECTED"
                              ? "destructive"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {a.status}
                      </Badge>
                      <span>Proposed {formatDate(a.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Evidence is kept on the record for this connection. Both parties and
            an administrator can review it if a dispute is raised.
          </p>
          {(evidence as ConnectionEvidenceRow[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {(evidence as ConnectionEvidenceRow[]).map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-muted p-3 text-sm">
                  <span className="font-semibold">
                    {e.type.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {e.description && <p className="mt-1 text-muted-foreground">{e.description}</p>}
                  {e.file_access_key ? (
                    <a
                      href={`/api/evidence/${e.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Paperclip className="h-3 w-3" aria-hidden="true" />
                      View attachment
                    </a>
                  ) : e.file_url ? (
                    <a
                      href={e.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Paperclip className="h-3 w-3" aria-hidden="true" />
                      View link
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {isLinker && isConnectionOpen(conn.status) && (
            <SubmitEvidence connectionId={conn.id} />
          )}
          {isLinker && !isConnectionOpen(conn.status) && (
            <p className="text-sm text-muted-foreground">
              This connection is closed, so the evidence record is final.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completion (Phase 14, §5.7). The Seeker confirms/rejects the evidence;
          the platform verifies and releases. Both roles see the workflow state,
          but only the Seeker gets the confirm/reject controls. */}
      {(isSeeker || isLinker) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompleteConnection
              connectionId={conn.id}
              status={conn.status}
              role={isSeeker ? "seeker" : "linker"}
              riskLevel={conn.risk_level}
            />
            {isSeeker && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "PENDING_ACKNOWLEDGEMENT",
                  "IN_PROGRESS",
                  "EVIDENCE_SUBMITTED",
                  "AWAITING_SEEKER_CONFIRMATION",
                  "AWAITING_VERIFICATION",
                ].includes(conn.status) && <MarkFailed connectionId={conn.id} />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extension (§5.14). The Linker requests; the SEEKER decides. Only an
          accepted extension moves the deadline and clears the yellow flag, so
          the two roles see different things here. */}
      {isLinker &&
        ["IN_PROGRESS", "AWAITING_VERIFICATION"].includes(conn.status) &&
        (openExtension ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" /> Extension requested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You asked for {openExtension.days_requested} more day(s). The
                deadline does not move until the Seeker accepts.
              </p>
              {openExtension.reason && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Reason: {openExtension.reason}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <ExtensionForm connectionId={conn.id} />
        ))}

      {isSeeker && openExtension && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" /> Extension request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openExtension.reason && (
              <p className="text-sm text-muted-foreground">
                Reason given: {openExtension.reason}
              </p>
            )}
            <ExtensionDecision
              extensionId={openExtension.id}
              daysRequested={openExtension.days_requested}
            />
          </CardContent>
        </Card>
      )}

      {/* Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review</CardTitle>
        </CardHeader>
        <CardContent>
          {(theirReviews as ReviewRow[]).length > 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Your counterparty has {(theirReviews as ReviewRow[]).length} review(s):{" "}
              {(
                (theirReviews as ReviewRow[]).reduce((s, r) => s + r.rating, 0) /
                (theirReviews as ReviewRow[]).length
              ).toFixed(1)}{" "}
              / 5 average.
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Your counterparty has no reviews yet.
            </p>
          )}
          {conn.status === "COMPLETED" &&
            (myReview ? (
              <p className="text-sm text-muted-foreground">
                You reviewed this connection{" "}
                {formatDate((myReview as ReviewRow).created_at)} — {myReview.rating} / 5.
                One review per connection.
              </p>
            ) : (
              <ReviewForm
                opportunityId={opp.id}
                subjectId={counterpartyId}
              />
            ))}
        </CardContent>
      </Card>

      {/* Disputes & Resolution Assistance */}
      {conn.status !== "FAILED" && conn.status !== "DISPUTED" && !dispute && (
        <Card className="border-border bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
              <Scale className="h-4 w-4" /> Issue or Terms Contest?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              If either party fails to perform or the agreed connection terms are contested, you can raise an official dispute. This freezes all escrow releases while administrators investigate.
            </p>
            <RaiseDisputeForm connectionId={conn.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}