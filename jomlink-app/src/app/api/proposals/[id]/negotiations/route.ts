import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getNegotiationsByProposal,
  getOpportunityById,
  getProposalById,
} from "@/lib/queries";

/**
 * GET /api/proposals/[id]/negotiations
 * Returns the negotiation thread for a proposal.
 *
 * Restricted to the two parties on the proposal (the Linker who authored it and
 * the Seeker who owns the opportunity) — the thread carries offered rewards and
 * free-text messages, so it must not be readable by id alone.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const proposal = await getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const opp = await getOpportunityById(proposal.opportunity_id);
    const isLinker = proposal.linker_id === user.id;
    const isSeeker = opp?.seeker_id === user.id;
    if (!isLinker && !isSeeker) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await getNegotiationsByProposal(id);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    console.error("negotiations API error", e);
    return NextResponse.json([], { status: 500 });
  }
}