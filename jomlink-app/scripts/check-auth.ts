import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenvConfig({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error("listUsers error:", error.message);
    return;
  }
  console.log("Total users in Supabase Auth:", data.users.length);
  for (const u of data.users) {
    console.log(`- ${u.email} | id=${u.id} | confirmed=${u.email_confirmed_at ? "yes" : "no"}`);
  }

  // Try an actual sign-in with the demo credentials via the anon key.
  const client = createClient(url, anon);
  const res = await client.auth.signInWithPassword({
    email: "demo@jomlink.my",
    password: process.env.DEMO_MEMBER_PASSWORD ?? "Demo@Member2026",
  });
  console.log("\nSign-in attempt:", res.error ? `❌ ${res.error.message}` : "✅ success");
}

main();