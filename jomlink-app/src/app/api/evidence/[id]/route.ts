import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getEvidenceById,
  getConnectionById,
  getOpportunityById,
} from "@/lib/queries";
import { getServiceRoleClient } from "@/lib/supabase/admin";

const EVIDENCE_BUCKET = "connection-evidence";

/**
 * GET /api/evidence/[id]
 * Streams a private connection-evidence attachment to a party of the connection.
 *
 * The `connection-evidence` bucket is private (public=false), so we mint a
 * short-lived signed URL server-side (service-role) and redirect the browser to
 * it. The service-role key never leaves the server; the signed URL expires in 60s.
 *
 * Authorization: only the Linker and the Seeker on the connection may read its
 * evidence — the same rule that gates the progress thread.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const evidence = await getEvidenceById(id);
    if (!evidence?.file_access_key) {
      return NextResponse.json({ error: "No attachment on record" }, { status: 404 });
    }

    const conn = await getConnectionById(evidence.connection_id);
    if (!conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const opp = await getOpportunityById(conn.opportunity_id);
    const isLinker = conn.linker_id === user.id;
    const isSeeker = opp?.seeker_id === user.id;
    if (!isLinker && !isSeeker) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(evidence.file_access_key, 60);
    if (error || !data?.signedUrl) {
      console.error("evidence signed URL error", error);
      return NextResponse.json(
        { error: "Could not generate attachment link" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (e: unknown) {
    console.error("evidence route error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
