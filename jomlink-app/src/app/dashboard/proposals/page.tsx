import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getProposalsByLinkerWithOpportunity,
  getConnectionsByUser,
  getNegotiationsByProposal,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";
import { isProposalNegotiable } from "@/lib/status";
import { NegotiationPanel } from "@/components/negotiation-panel";

export const metadata = { title: "My Proposals · Jomlink" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SELECTED: "Selected",
  COMPLETED: "Completed",
};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export default async function MyProposalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const proposals = await getProposalsByLinkerWithOpportunity(user.id);

  // Map each proposal to its connection (created when the Seeker selects the
  // Linker) so a SELECTED proposal can link straight into the workspace.
  const connections = proposals.some((p) => p.status === "SELECTED")
    ? await getConnectionsByUser(user.id)
    : [];
  const connectionByProposal = new Map(
    connections.map((c) => [c.proposal_id, c.id] as const)
  );

  // Load negotiation threads for proposals that are still live, so a Linker can
  // see and answer a Seeker's counter-offer without leaving this page.
  const negotiable = proposals.filter((p) => isProposalNegotiable(p.status));
  const threads = await Promise.all(
    negotiable.map((p) => getNegotiationsByProposal(p.id))
  );
  const threadByProposal = new Map(
    negotiable.map((p, i) => [p.id, threads[i]] as const)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Proposals</h1>
        <p className="mt-1 text-muted-foreground">
          Proposals you have submitted as a Linker.
        </p>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              You haven&apos;t submitted any proposals yet.
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const opp = p.opportunities;
            const thread = threadByProposal.get(p.id) ?? [];
            const latest = thread.length > 0 ? thread[thread.length - 1] : null;
            // The Linker can accept unless they authored the standing offer —
            // you cannot agree with yourself.
            const canAccept = latest ? latest.from_role !== "LINKER" : true;
            const negotiable = isProposalNegotiable(p.status);

            return (
              <Card key={p.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{opp?.title ?? "Opportunity"}</p>
                        <Badge variant={p.status === "SELECTED" ? "success" : "secondary"}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                        {p.is_target_substitution && (
                          <Badge variant="warning">Substitution</Badge>
                        )}
                        {latest && (
                          <Badge variant="default">Counter-offer</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Proposed reward {money(p.proposed_reward)} · Submitted{" "}
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {p.status === "SELECTED" && connectionByProposal.get(p.id) && (
                        <Button asChild size="sm">
                          <Link
                            href={
                              "/dashboard/connections/" +
                              connectionByProposal.get(p.id)
                            }
                          >
                            Go to connection
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={"/opportunities/" + p.opportunity_id}>
                          View opportunity
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Negotiation is a two-sided conversation: the Linker must be
                      able to answer a Seeker's counter-offer from their own list. */}
                  <NegotiationPanel
                    proposalId={p.id}
                    currentReward={p.agreed_reward ?? p.proposed_reward}
                    currentDeliverable={p.agreed_deliverable ?? p.proposed_deliverable}
                    status={p.status}
                    negotiable={negotiable}
                    canAccept={canAccept}
                    compact
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}