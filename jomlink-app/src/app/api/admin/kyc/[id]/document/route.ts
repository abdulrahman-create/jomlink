import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/rbac";
import { getKycRecordById } from "@/lib/queries";
import { getServiceRoleClient } from "@/lib/supabase/admin";

const KYC_BUCKET = "kyc-documents";

/**
 * GET /api/admin/kyc/[id]/document
 * Streams the private KYC identity document for admin review.
 *
 * The `kyc-documents` bucket is private (public=false), so we generate a
 * short-lived signed URL server-side (service-role) and redirect the admin's
 * browser to it. The service-role key never leaves the server, and the signed
 * URL expires after 60 seconds.
 *
 * Authorization: any admin with `kyc:read` may view documents.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.can("kyc:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const kyc = await getKycRecordById(id);
    if (!kyc?.document_ref) {
      return NextResponse.json({ error: "No document on record" }, { status: 404 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .createSignedUrl(kyc.document_ref, 60);
    if (error || !data?.signedUrl) {
      console.error("kyc document signed URL error", error);
      return NextResponse.json({ error: "Could not generate document link" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (e: unknown) {
    console.error("kyc document route error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}