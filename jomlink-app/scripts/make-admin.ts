/**
 * Promote a Jomlink member to admin (idempotent).
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts <email> [ADMIN_ROLE]
 *
 * Example:
 *   npx tsx scripts/make-admin.ts admin@jomlink.my SUPER_ADMIN
 *
 * What it does:
 *   1. Finds the Supabase Auth user by email (must exist).
 *   2. Ensures a jomlink.users row exists, linked to that auth id, with role=ADMIN.
 *   3. Upserts a jomlink.admin_members row with the given role + permissions.
 *   4. Removes any orphaned admin_members rows whose user_id no longer exists.
 */
import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenvConfig({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sc = () =>
  admin.schema("jomlink" as never) as unknown as {
    from: (t: string) => any;
  };

const VALID_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS",
  "KYC",
  "FINANCE",
  "DISPUTE",
  "COMPLIANCE",
  "SUPPORT",
] as const;

async function main() {
  const email = process.argv[2];
  const adminRole = (process.argv[3] ?? "SUPER_ADMIN").toUpperCase();

  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email> [ADMIN_ROLE]");
    process.exit(1);
  }
  if (!VALID_ROLES.includes(adminRole as (typeof VALID_ROLES)[number])) {
    console.error(`Invalid role "${adminRole}". Valid: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  // 1. Find the Supabase Auth user.
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers();
  if (authErr) throw authErr;
  const authUser = authData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!authUser) {
    console.error(`❌ No Supabase Auth user found for ${email}.`);
    console.error("   Create the account first (register in the app), then re-run.");
    process.exit(1);
  }
  console.log(`✅ Found auth user: ${authUser.email} (${authUser.id})`);

  // 2. Tag the auth user as Jomlink so getCurrentUser() recognises it.
  if (authUser.app_metadata?.app !== "jomlink") {
    await admin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { ...authUser.app_metadata, app: "jomlink" },
    });
    console.log("🔗 Tagged auth user with app='jomlink'");
  }

  // 3. Ensure a jomlink.users row exists and is linked + role=ADMIN.
  const { data: existing, error: findErr } = await sc()
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (findErr) throw findErr;

  let memberId: string;
  if (existing) {
    const { data: updated, error: updErr } = await sc()
      .from("users")
      .update({ role: "ADMIN", supabase_user_id: authUser.id, app: "jomlink" })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updErr) throw updErr;
    memberId = updated.id;
    console.log(`✅ Updated jomlink.users ${memberId} → role=ADMIN`);
  } else {
    const { data: created, error: insErr } = await sc()
      .from("users")
      .insert({
        email,
        email_verified: !!authUser.email_confirmed_at,
        mobile: authUser.phone ?? "",
        password_hash: "",
        full_name:
          (authUser.user_metadata?.full_name as string) ??
          email.split("@")[0],
        country: (authUser.user_metadata?.country as string) ?? "MY",
        supabase_user_id: authUser.id,
        app: "jomlink",
        role: "ADMIN",
      })
      .select("*")
      .single();
    if (insErr) throw insErr;
    memberId = created.id;
    console.log(`✅ Created jomlink.users ${memberId} with role=ADMIN`);
  }

  // 4. Upsert the admin_members row.
  const permissions = adminRole === "SUPER_ADMIN" ? ["*"] : [];
  const { data: existingAdmin } = await sc()
    .from("admin_members")
    .select("*")
    .eq("user_id", memberId)
    .maybeSingle();

  if (existingAdmin) {
    const { error } = await sc()
      .from("admin_members")
      .update({ role: adminRole, permissions })
      .eq("id", existingAdmin.id);
    if (error) throw error;
    console.log(`✅ Updated admin_members → role=${adminRole}`);
  } else {
    const { error } = await sc()
      .from("admin_members")
      .insert({ user_id: memberId, role: adminRole, permissions });
    if (error) throw error;
    console.log(`✅ Created admin_members → role=${adminRole}`);
  }

  // 5. Clean up orphaned admin_members rows (user_id no longer in users).
  const { data: allAdmins } = await sc().from("admin_members").select("id, user_id");
  const { data: allUsers } = await sc().from("users").select("id");
  const userIds = new Set((allUsers ?? []).map((u: { id: string }) => u.id));
  const orphans = (allAdmins ?? []).filter(
    (a: { id: string; user_id: string }) => !userIds.has(a.user_id)
  );
  for (const o of orphans) {
    await sc().from("admin_members").delete().eq("id", o.id);
    console.log(`🧹 Removed orphaned admin_members row ${o.id} (user_id=${o.user_id})`);
  }

  console.log(`\n🎉 ${email} can now access /admin as ${adminRole}.`);
  console.log("   Log out and back in, then visit /admin.");
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
