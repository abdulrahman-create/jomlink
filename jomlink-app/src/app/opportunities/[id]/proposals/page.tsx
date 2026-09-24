import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getProposalsWithLinker,
} from "@/lib/queries";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { ProposalCard } from "./proposal-card";
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
            {proposals.map(
              (p: LinkerProposalRow & {
                users?: { full_name?: string; country?: string } | null;
              }) => (
                <ProposalCard key={p.id} proposal={p} opportunityId={opp.id} />
              )
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}