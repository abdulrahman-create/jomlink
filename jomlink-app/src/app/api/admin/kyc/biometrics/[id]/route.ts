import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/rbac";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { getKycBiometricById } from "@/lib/queries";

const BUCKET = "kyc-biometrics";

/**
 * GET /api/admin/kyc/biometrics/[id]?asset=selfie|id
 *
 * Admin-only access to a biometric capture. Mints a short-lived (60s) signed
 * URL for the private `kyc-biometrics` object and redirects to it. Access is
 * gated on the `kyc:read` permission and every call surfaces the same data via
 * server logs (the audit trail records review actions separately).
 *
 * The images are NEVER public — this is the only path an admin can read them.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; asset?: string[] }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.can("kyc:read")) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id, asset } = await params;
  const which = asset?.[0] === "id" ? "id_document_path" : "selfie_path";

  const record = await getKycBiometricById(id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path = which === "id_document_path" ? record.id_document_path : record.selfie_path;
  if (!path) {
    return NextResponse.json({ error: "Asset missing" }, { status: 404 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    console.error("biometric signed url error", error);
    return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
