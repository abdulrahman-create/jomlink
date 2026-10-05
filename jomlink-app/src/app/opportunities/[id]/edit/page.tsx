import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityById, hasProposalsForOpportunity } from "@/lib/queries";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { OpportunityEditForm } from "./opportunity-edit-form";

export const metadata = { title: "Edit Opportunity · Jomlink" };

/**
 * Statuses in which the Seeker may still edit their own opportunity.
 * Editing is additionally blocked as soon as any Linker has submitted a
 * proposal (checked separately below).
 */
const EDITABLE_STATUSES = new Set([
  "DRAFT",
  "PENDING_PAYMENT",
  "ACTIVE",
  "PROPOSAL_RECEIVED",
  "NEGOTIATION",
]);

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/opportunities/${id}/edit`);

  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  // Only the owning Seeker may edit, and only while the listing is editable.
  if (opp.seeker_id !== user.id) notFound();
  const lockedByProposal = await hasProposalsForOpportunity(opp.id);
  if (!EDITABLE_STATUSES.has(opp.status) || lockedByProposal) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeaderWithUser />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
          <div className="rounded-md border border-border bg-muted px-4 py-6 text-sm">
            <p className="font-semibold">This opportunity can no longer be edited.</p>
            <p className="mt-1 text-muted-foreground">
              {lockedByProposal
                ? "A Linker has already submitted a proposal, so the listing is frozen to protect the terms they applied against."
                : "A Linker has been selected or the reward is already in escrow, so the listing is committed."}{" "}
              You can still view it on the opportunity page.
            </p>
            <Link
              href={`/opportunities/${opp.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to opportunity
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={`/opportunities/${opp.id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to opportunity
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit Opportunity</h1>
          <p className="mt-2 text-muted-foreground">
            Update the details of your listing. Changes are saved immediately.
          </p>
        </div>
        <OpportunityEditForm opportunity={opp} />
      </main>
      <SiteFooter />
    </div>
  );
}
