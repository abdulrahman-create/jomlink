import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ClipboardCheck, Sparkles, Scale, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  getOpportunityById,
  getAppointmentsByConnection,
  getEvidenceByConnection,
  getReviewsForSubject,
  getDisputeByConnectionId,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import type { AppointmentRow, ConnectionEvidenceRow, ReviewRow } from "@/lib/jomlink-types";
import {
  ProposeAppointment,
  AppointmentActions,
  SubmitEvidence,
  CompleteConnection,
  ExtensionForm,
  MarkFailed,
  ReviewForm,
  RaiseDisputeForm,
} from "./actions";

export const metadata = { title: "Connection · Jomlink" };

const CONN_STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
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

  const [appointments, evidence, reviews, dispute] = await Promise.all([
    getAppointmentsByConnection(conn.id),
    getEvidenceByConnection(conn.id),
    getReviewsForSubject(isSeeker ? user.id : opp.seeker_id),
    getDisputeByConnectionId(conn.id),
  ]);

  const latestAppointment = (appointments as AppointmentRow[])[
    (appointments as AppointmentRow[]).length - 1
  ] ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
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

              {isSeeker &&
                latestAppointment.status === "PROPOSED" && (
                  <AppointmentActions appointmentId={latestAppointment.id} />
                )}
            </div>
          ) : isLinker ? (
            <ProposeAppointment connectionId={conn.id} withError={conn.status === "PENDING_ACKNOWLEDGEMENT"} />
          ) : (
            <p className="text-sm text-muted-foreground">
              The Linker will propose an appointment.
            </p>
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
          {(evidence as ConnectionEvidenceRow[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {(evidence as ConnectionEvidenceRow[]).map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-muted p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {e.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                    {e.approved === null ? (
                      <Badge variant="warning">Pending review</Badge>
                    ) : e.approved ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </div>
                  {e.description && <p className="mt-1 text-muted-foreground">{e.description}</p>}
                </li>
              ))}
            </ul>
          )}
          {isLinker && <SubmitEvidence connectionId={conn.id} />}
        </CardContent>
      </Card>

      {/* Completion */}
      {isSeeker && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompleteConnection connectionId={conn.id} status={conn.status} />
            <div className="mt-3 flex flex-wrap gap-2">
              {["PENDING_ACKNOWLEDGEMENT", "IN_PROGRESS", "AWAITING_VERIFICATION"].includes(
                conn.status
              ) && <MarkFailed connectionId={conn.id} />}
            </div>
          </CardContent>
        </Card>
      )}

      {isLinker && conn.status === "COMPLETED" && (
        <ExtensionForm connectionId={conn.id} />
      )}

      {/* Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review</CardTitle>
        </CardHeader>
        <CardContent>
          {(reviews as ReviewRow[]).length > 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              You have {reviews.length} review(s):{" "}
              {(reviews as ReviewRow[]).reduce((s, r) => s + r.rating, 0) /
                (reviews as ReviewRow[]).length}{" "}
              / 5 average.
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">No reviews yet.</p>
          )}
          {conn.status === "COMPLETED" && (
            <ReviewForm
              opportunityId={opp.id}
              subjectId={isSeeker ? conn.linker_id : opp.seeker_id}
            />
          )}
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