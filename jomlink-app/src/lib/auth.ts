import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isJomlinkAuthUser } from "@/lib/data";
import {
  findMemberBySupabaseId,
  findMemberByEmail,
  upsertMemberForAuth,
  getProfileByUserId,
} from "@/lib/queries";

/**
 * Returns the currently authenticated Jomlink member (from the jomlink schema),
 * together with its member profile, or null if there is no valid Supabase session
 * or the auth user does not belong to Jomlink.
 *
 * AUTH CONFLICT-AVOIDANCE:
 *   • We only ever match business users tagged with `app = 'jomlink'`, so a
 *     logged-in user belonging to another app of this Supabase project will
 *     NOT be matched to a Jomlink row.
 *   • If the Supabase auth user is authenticated and carries the jomlink tag
 *     (via app_metadata.app === 'jomlink') but has no Jomlink row yet, we
 *     auto-provision one.
 *   • Supabase auth users WITHOUT the jomlink tag are treated as null here
 *     (not provisioned, not linked) to avoid cross-app user conflicts.
 *
 * Returned member is normalized so UI components can use `member.fullName`,
 * `member.role`, `member.profile.*` regardless of the snake_case rows.
 *
 * Cached per request using React `cache()`.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (!isJomlinkAuthUser(user)) return null;

  // Prefer the linked supabaseUserId; fall back to email match.
  let row =
    (await findMemberBySupabaseId(user.id)) ??
    (await findMemberByEmail(user.email));

  if (!row) {
    row = await upsertMemberForAuth({
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at ?? undefined,
      phone: user.phone ?? undefined,
      user_metadata: (user.user_metadata ?? {}) as {
        full_name?: string;
        country?: string;
      },
    });
  }

  // Load the member profile for the current user.
  const profile = await getProfileByUserId(row.id);

  // Normalize to a UI-friendly shape (camelCase + joined profile).
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    mobile: row.mobile,
    country: row.country,
    location: row.location,
    role: row.role,
    supabaseUserId: row.supabase_user_id,
    profile: profile
      ? {
          verifiedBadge: profile.verified_badge,
          verificationStatus: profile.verification_status,
          headline: profile.headline,
        }
      : null,
  } as const;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;