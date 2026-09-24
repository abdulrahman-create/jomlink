import { config as dotenvConfig } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local explicitly (tsx does not auto-load it).
dotenvConfig({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Supabase admin client (server-side only).
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

/** Ensure a user exists in Supabase Auth, returning their id. */
async function upsertSupabaseUser(email: string, password: string) {
  if (!supabaseAdmin) {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY missing — skipping Supabase auth sync.");
    return undefined;
  }
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === email);
  if (found) return found.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email },
  });
  if (error) throw error;
  return data?.user?.id;
}

async function main() {
  console.log("🌱 Seeding Jomlink reference data...");

  // Ensure a super admin exists.
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@jomlink.my";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Jomlink@Admin2026";
  let admin = await prisma.users.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const supabaseUserId = await upsertSupabaseUser(adminEmail, adminPassword);
    admin = await prisma.users.create({
      data: {
        email: adminEmail,
        emailVerified: true,
        mobile: "+60000000000",
        mobileVerified: true,
        passwordHash,
        fullName: "Jomlink Super Admin",
        country: "MY",
        role: "ADMIN",
        status: "ACTIVE",
        supabaseUserId,
      },
    });
    await prisma.admin_members.create({
      data: {
        userId: admin.id,
        role: "SUPER_ADMIN",
        permissions: ["*"],
        mfaEnabled: true,
      },
    });
    console.log(`✅ Super admin created: ${adminEmail}`);
  } else {
    // Backfill the Supabase auth link if missing.
    if (!admin.supabaseUserId) {
      const supabaseUserId = await upsertSupabaseUser(adminEmail, adminPassword);
      admin = await prisma.users.update({
        where: { id: admin.id },
        data: { supabaseUserId },
      });
      console.log(`🔗 Super admin linked to Supabase: ${adminEmail}`);
    }
    console.log(`ℹ️ Super admin already exists: ${adminEmail}`);
  }

  // Seed a few orgs for relationship declarations (sample data).
  const orgNames = ["Prasarana Malaysia Berhad", "Maybank", "Tenaga Nasional Berhad"];
  for (const name of orgNames) {
    const exists = await prisma.organisations.findFirst({ where: { name } });
    if (!exists) {
      await prisma.organisations.create({ data: { name, type: "company", country: "MY" } });
    }
  }
  console.log(`✅ Sample organisations ready (${orgNames.length})`);

  // Seed a demo member (both roles).
  const memberEmail = process.env.DEMO_MEMBER_EMAIL ?? "demo@jomlink.my";
  const memberPassword = process.env.DEMO_MEMBER_PASSWORD ?? "Demo@Member2026";
  let member = await prisma.users.findUnique({ where: { email: memberEmail } });
  if (!member) {
    const passwordHash = await bcrypt.hash(memberPassword, 12);
    const supabaseUserId = await upsertSupabaseUser(memberEmail, memberPassword);
    const created = await prisma.users.create({
      data: {
        email: memberEmail,
        emailVerified: true,
        mobile: "+60123456789",
        mobileVerified: true,
        passwordHash,
        fullName: "Aina Rahman",
        country: "MY",
        location: "Kuala Lumpur",
        role: "BOTH",
        supabaseUserId,
      },
    });
    member = created;
    await prisma.member_profiles.create({
      data: {
        userId: member.id,
        headline: "Business Development Manager",
        currentPosition: "Business Development Manager",
        currentOrganisation: "Sime Darby Berhad",
        industry: "Trading",
        city: "Kuala Lumpur",
        region: "Kuala Lumpur",
        country: "MY",
        languages: ["English", "Malay"],
        yearsOfExperience: 12,
        bio: "Experienced in corporate business development and procurement.",
        verifiedBadge: true,
        verificationStatus: "VERIFIED",
      },
    });
    // Demo relationship declaration.
    await prisma.relationships.create({
      data: {
        userId: member.id,
        entityName: "Prasarana Malaysia Berhad",
        category: "FORMER_EMPLOYEE",
        visibility: "PUBLIC",
        connectionDegree: "FIRST",
        relevanceNote:
          "Formerly worked with the corporate affairs division; maintain professional relationships within the organisation.",
        verified: true,
        verificationStatus: "VERIFIED",
      },
    });
    console.log(`✅ Demo member created: ${memberEmail}`);
  } else {
    // Backfill the Supabase auth link if missing.
    if (!member.supabaseUserId) {
      const supabaseUserId = await upsertSupabaseUser(memberEmail, memberPassword);
      await prisma.users.update({
        where: { id: member.id },
        data: { supabaseUserId },
      });
      console.log(`🔗 Demo member linked to Supabase: ${memberEmail}`);
    }
    console.log(`ℹ️ Demo member already exists: ${memberEmail}`);
  }

  console.log("🌱 Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });