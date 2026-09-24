"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getProfileByUserId,
  upsertProfile,
  createEmployment,
  deleteEmploymentIfOwned,
  createBusinessProfile,
  deleteBusinessProfileIfOwned,
  setUserRole,
} from "@/lib/queries";

// ── Validation ──────────────────────────────────────────────
const ProfileSchema = z.object({
  headline: z.string().max(120).optional().or(z.literal("")),
  currentPosition: z.string().max(120).optional().or(z.literal("")),
  currentOrganisation: z.string().max(160).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(10).optional().or(z.literal("")),
  yearsOfExperience: z.coerce.number().int().min(0).max(80).optional(),
  bio: z.string().max(1000).optional().or(z.literal("")),
  languages: z.array(z.string()).default([]),
});

export type ProfileState = { error?: string; success?: boolean };

/** Save/update the member's professional profile. */
export async function updateProfile(
  prevState: ProfileState | undefined,
  formData: FormData
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const langs = formData
    .getAll("languages")
    .map((l) => String(l).trim())
    .filter(Boolean);

  const parsed = ProfileSchema.safeParse({
    headline: formData.get("headline") || undefined,
    currentPosition: formData.get("currentPosition") || undefined,
    currentOrganisation: formData.get("currentOrganisation") || undefined,
    industry: formData.get("industry") || undefined,
    city: formData.get("city") || undefined,
    region: formData.get("region") || undefined,
    country: formData.get("country") || undefined,
    yearsOfExperience:
      formData.get("yearsOfExperience") === ""
        ? undefined
        : formData.get("yearsOfExperience"),
    bio: formData.get("bio") || undefined,
    languages: langs,
  });

  if (!parsed.success) {
    return { error: "Please review the highlighted fields." };
  }

  const d = parsed.data;

  try {
    await upsertProfile(user.id, {
      headline: d.headline || null,
      current_position: d.currentPosition || null,
      current_organisation: d.currentOrganisation || null,
      industry: d.industry || null,
      city: d.city || null,
      region: d.region || null,
      country: d.country || null,
      years_of_experience: d.yearsOfExperience ?? null,
      bio: d.bio || null,
      languages: d.languages,
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("updateProfile", e);
    return { error: "Could not save your profile." };
  }
}

// ── Employment history ──────────────────────────────────────

const EmploymentSchema = z.object({
  organisation: z.string().min(1, "Organisation is required"),
  position: z.string().min(1, "Position is required"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  current: z.coerce.boolean().default(false),
  description: z.string().max(600).optional().or(z.literal("")),
});

export type EmploymentState = { error?: string; success?: boolean };

export async function addEmployment(
  prevState: EmploymentState | undefined,
  formData: FormData
): Promise<EmploymentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = EmploymentSchema.safeParse({
    organisation: formData.get("organisation"),
    position: formData.get("position"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || null,
    current: formData.get("current") === "on",
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: "Please check the employment fields." };

  // Ensure a profile row exists before adding employment.
  const profile = (await getProfileByUserId(user.id)) ?? (await upsertProfile(user.id, {}));

  await createEmployment(profile.id, {
    organisation: parsed.data.organisation,
    position: parsed.data.position,
    start_date: parsed.data.startDate ?? null,
    end_date: parsed.data.current ? null : (parsed.data.endDate ?? null),
    current: parsed.data.current,
    description: parsed.data.description || null,
  });

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function removeEmployment(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Security: only delete if the employment belongs to this user's profile.
  const profile = await getProfileByUserId(user.id);
  if (!profile) return;

  await deleteEmploymentIfOwned(id, profile.id);
  revalidatePath("/dashboard/profile");
}

// ── Business profiles ───────────────────────────────────────

const BusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(800).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  objectives: z.array(z.string()).default([]),
});

export type BusinessState = { error?: string; success?: boolean };

export async function addBusinessProfile(
  prevState: BusinessState | undefined,
  formData: FormData
): Promise<BusinessState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const objectives = formData
    .getAll("objectives")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const parsed = BusinessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    objectives,
  });
  if (!parsed.success) return { error: "Please check the business fields." };

  await createBusinessProfile(user.id, {
    name: parsed.data.name,
    industry: parsed.data.industry || null,
    description: parsed.data.description || null,
    website: parsed.data.website || null,
    objectives: parsed.data.objectives,
  });

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function removeBusinessProfile(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteBusinessProfileIfOwned(id, user.id);
  revalidatePath("/dashboard/profile");
}

// ── Role toggle ─────────────────────────────────────────────

const ROLES = ["SEEKER", "LINKER", "BOTH"] as const;

export async function toggleRole(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const requested = String(formData.get("role") ?? "").toUpperCase();
  if (!ROLES.includes(requested as (typeof ROLES)[number])) return;

  await setUserRole(user.id, requested);
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}

/** Set which account capability the user is actively using (for nav highlight). */
export async function setActiveCapability(formData: FormData) {
  return { success: true };
}