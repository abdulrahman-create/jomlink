import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getProposalsWithLinker,
  getWalletBalance,
} from "@/lib/queries";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { ProposalCard } from "./proposal-card";
import {
  computeMatchScore,
  matchLabel,
  matchReason,
  buildMatchInput,
  matchOpportunityFields,
  type LinkedMember,
} from "@/lib/matching";
import type { LinkerProposalRow } from "@/lib/jomlink-types";

export const metadata = { title: "Proposals · Jomlink" };

export default async function OpportunityProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/opportunities/" + id + "/proposals");
  if (opp.seeker_id !== user.id) redirect("/opportunities/" + id);

  const proposals = await getProposalsWithLinker(opp.id);

  // Selecting a Linker settles the FULL reward from the Seeker's wallet. Load the
  // balance here so the card can show the shortfall and disable the button up
  // front — otherwise the Seeker only learns they cannot afford it after pressing
  // Select, which is a dead end.
  const walletBalance = await getWalletBalance(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={"/opportunities/" + opp.id}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to opportunity
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="mt-2 text-muted-foreground">{opp.title}</p>
        </div>

        {proposals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            No proposals yet. Linkers will appear here once they apply.
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((p: LinkerProposalRow & { users?: LinkedMember | null }) => {
              // Score each proposal against the opportunity so the Seeker can
              // see how strong each Linker's claim to the target entity is.
              const matchInput = buildMatchInput({
                opportunity: matchOpportunityFields(opp),
                linker: p.users ?? null,
              });
              const score = computeMatchScore(matchInput);
              return (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  opportunityId={opp.id}
                  opportunityStatus={opp.status}
                  walletBalance={walletBalance}
                  matchScore={score}
                  matchLabelText={matchLabel(score)}
                  matchReasonText={matchReason(matchInput)}
                />
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}