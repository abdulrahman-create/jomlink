import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProposalsForSeeker } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMYR, formatDate } from "@/lib/constants";
import { PROPOSAL_STATUS_LABEL, statusVariant } from "@/lib/status";
import type { LinkerProposalRow } from "@/lib/jomlink-types";

export const metadata = { title: "Proposals Received · Jomlink" };

type ReceivedProposal = LinkerProposalRow & {
  opportunities?: { title?: string | null } | null;
  users?: { full_name?: string | null; country?: string | null } | null;
};

export default async function ProposalsReceivedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const proposals = (await getProposalsForSeeker(user.id)) as ReceivedProposal[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Proposals Received</h1>
        <p className="mt-1 text-muted-foreground">
          Proposals Linkers have submitted on opportunities you posted.
        </p>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              No proposals yet. Linkers will apply once your opportunity is active.
            </p>
            <Button asChild>
              <Link href="/opportunities/new">Post an opportunity</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {p.opportunities?.title ?? "Opportunity"}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.users?.full_name ?? "A Linker"}
                    {p.users?.country ? ` · ${p.users.country}` : ""} · Submitted{" "}
                    {formatDate(p.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {p.is_target_substitution && (
                    <Badge variant="warning">Substitution</Badge>
                  )}
                  <Badge variant={statusVariant(p.status)}>
                    {PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Proposed reward{" "}
                  <span className="font-semibold">{formatMYR(p.proposed_reward)}</span>
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/opportunities/${p.opportunity_id}/proposals`}>
                    Review proposal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
