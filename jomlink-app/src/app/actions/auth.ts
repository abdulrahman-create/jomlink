"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { jomlinkSchema } from "@/lib/data";

// ── Validation schemas ──────────────────────────────────────
const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  mobile: z.string().min(8, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.string().min(2, "Country is required"),
});

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

// ── Register ────────────────────────────────────────────────
export async function registerMember(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
    country: formData.get("country"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { fullName, email, mobile, password, country } = parsed.data;
  const supabase = await createSupabaseServerClient();

  // 1. Create the Supabase Auth user (identity layer), tagged as Jomlink.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, country },
      // Tag this auth user so other apps' users are never cross-linked.
    },
  });

  if (error) {
    return { error: error.message };
  }

  const supabaseUserId = data.user?.id;

  // 2. Tag the created auth user with app='jomlink' (conflict-avoidance).
  //    This must happen on the Identity layer so getCurrentUser can filter
  //    by app and never touch other apps' users.
  if (supabaseUserId) {
    try {
      await getServiceRoleClient().auth.admin.updateUserById(supabaseUserId, {
        app_metadata: { app: "jomlink" },
      });
    } catch (e) {
      console.error("registerMember: tag auth user failed", e);
    }
  }

  // 3. Create the Jomlink member row in the jomlink schema.
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { error: insertError } = await jomlinkSchema().from("users").insert({
      email,
      email_verified: !!data.user?.email_confirmed_at,
      mobile,
      password_hash: passwordHash,
      full_name: fullName,
      country,
      supabase_user_id: supabaseUserId,
      app: "jomlink",
      role: "SEEKER",
    });
    if (insertError) throw insertError;
  } catch (e: unknown) {
    // If the member insert fails, try to clean up the Supabase user.
    if (supabaseUserId) {
      await getServiceRoleClient().auth.admin
        .deleteUser(supabaseUserId)
        .catch(() => undefined);
    }
    if ((e as { code?: string }).code === "23505") {
      return { error: "An account with this email already exists." };
    }
    console.error("registerMember db error", e);
    return { error: "Could not create your account. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}

// ── Login ───────────────────────────────────────────────────
async function ensureJomlinkAuthUser(supabaseUserId: string) {
  // Tag the auth user as a Jomlink user so getCurrentUser() recognises it.
  try {
    await getServiceRoleClient().auth.admin.updateUserById(supabaseUserId, {
      app_metadata: { app: "jomlink" },
    });
  } catch (e) {
    console.error("ensureJomlinkAuthUser: tag failed", e);
  }
}

export async function loginMember(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Tag + provision this auth user as a Jomlink member so the dashboard
  // (getCurrentUser) can resolve it after redirect — avoids a redirect loop
  // where the proxy sends authed users away from /login but the layout
  // (unrecognised user) sends them back.
  if (data.user?.id) {
    await ensureJomlinkAuthUser(data.user.id);
  }

  revalidatePath("/");
  redirect("/dashboard");
}

// ── Logout ──────────────────────────────────────────────────
export async function logoutMember() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}