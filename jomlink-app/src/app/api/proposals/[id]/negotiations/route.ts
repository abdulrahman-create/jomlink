import { NextResponse } from "next/server";
import { getNegotiationsByProposal } from "@/lib/queries";

/**
 * GET /api/proposals/[id]/negotiations
 * Returns the negotiation thread for a proposal (public to the parties).
 * Note: this is a lightweight read used by the client proposal card. In a
 * hardened build, authorization (Linker or Seeker) should be enforced here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await getNegotiationsByProposal(id);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    console.error("negotiations API error", e);
    return NextResponse.json([], { status: 500 });
  }
}