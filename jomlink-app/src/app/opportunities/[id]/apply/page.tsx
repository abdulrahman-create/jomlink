import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getRelationships,
  getProposalByLinkerAndOpportunity,
} from "@/lib/queries";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { ProposalForm } from "./proposal-form";
import type { RelationshipRow } from "@/lib/jomlink-types";

export const metadata = { title: "Apply · Jomlink" };

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/opportunities/" + id + "/apply");
  if (opp.seeker_id === user.id) redirect("/opportunities/" + id);

  const [relationships, existing] = await Promise.all([
    getRelationships(user.id),
    getProposalByLinkerAndOpportunity(user.id, opp.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={"/opportunities/" + opp.id}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to opportunity
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Apply as a Linker</h1>
          <p className="mt-2 text-muted-foreground">
            {opp.title}
          </p>
        </div>

        <ProposalForm
          opportunityId={opp.id}
          relationships={relationships as RelationshipRow[]}
          existing={existing}
        />
      </main>
      <SiteFooter />
    </div>
  );
}