import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProposalsByLinkerWithOpportunity } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";
import type { LinkerProposalRow } from "@/lib/jomlink-types";

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
          {proposals.map((p: LinkerProposalRow & { opportunities?: unknown }) => {
            const opp = p.opportunities as
              | { title?: string; status?: string; offer_amount?: number; currency?: string }
              | null;
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{opp?.title ?? "Opportunity"}</p>
                      <Badge variant={p.status === "SELECTED" ? "success" : "secondary"}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                      {p.is_target_substitution && (
                        <Badge variant="warning">Substitution</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Proposed reward {money(p.proposed_reward)} · Submitted{" "}
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={"/opportunities/" + p.opportunity_id}>
                        View opportunity
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}