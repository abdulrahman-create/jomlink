"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  findOrganisationByName,
  createOrganisation,
  createRelationship,
  deleteRelationshipIfOwned,
  getRelationshipIfOwned,
  updateRelationshipFields,
} from "@/lib/queries";

// ── Validation ──────────────────────────────────────────────
const RelationshipSchema = z.object({
  entityName: z.string().min(2, "Organisation / entity name is required"),
  category: z.enum([
    "CURRENT_EMPLOYEE",
    "FORMER_EMPLOYEE",
    "BUSINESS_PARTNER",
    "CLIENT",
    "FORMER_CLIENT",
    "SUPPLIER",
    "CUSTOMER",
    "CONSULTANT",
    "ADVISOR",
    "INVESTOR",
    "PROFESSIONAL_CONTACT",
    "INDUSTRY_CONTACT",
    "ASSOCIATION_MEMBERSHIP",
    "GOVERNMENT_PUBLIC_SECTOR",
    "OTHER",
  ]),
  visibility: z.enum(["PUBLIC", "PLATFORM_ONLY", "OPPORTUNITY_SPECIFIC"]),
  connectionDegree: z.enum(["FIRST", "SECOND", "THIRD"]),
  relevanceNote: z.string().max(500).optional().or(z.literal("")),
  periodLabel: z.string().max(120).optional().or(z.literal("")),
});

export type RelationshipState = { error?: string; success?: boolean };

/** Declare a new professional relationship. */
export async function addRelationship(
  prevState: RelationshipState | undefined,
  formData: FormData
): Promise<RelationshipState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = RelationshipSchema.safeParse({
    entityName: formData.get("entityName"),
    category: formData.get("category"),
    visibility: formData.get("visibility") || "PUBLIC",
    connectionDegree: formData.get("connectionDegree") || "FIRST",
    relevanceNote: formData.get("relevanceNote") || undefined,
    periodLabel: formData.get("periodLabel") || undefined,
  });

  if (!parsed.success) {
    return { error: "Please check the relationship details." };
  }

  const d = parsed.data;

  try {
    // Resolve (or create) the organisation record for future matching.
    let organisation = await findOrganisationByName(d.entityName);
    if (!organisation) {
      organisation = await createOrganisation({
        name: d.entityName,
        country: user.location ? undefined : user.country,
      });
    }

    await createRelationship(user.id, {
      organisation_id: organisation.id,
      entity_name: d.entityName,
      category: d.category,
      visibility: d.visibility,
      connection_degree: d.connectionDegree,
      relevance_note: d.relevanceNote || null,
      period_label: d.periodLabel || null,
      verified: false,
      verification_status: "UNVERIFIED",
    });

    revalidatePath("/dashboard/relationships");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("addRelationship", e);
    return { error: "Could not save the relationship." };
  }
}

/** Remove one of the user's own relationship declarations. */
export async function removeRelationship(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteRelationshipIfOwned(id, user.id);
  revalidatePath("/dashboard/relationships");
  revalidatePath("/dashboard");
}

/** Update visibility/notes of the user's own relationship. */
export async function updateRelationship(
  prevState: RelationshipState | undefined,
  formData: FormData
): Promise<RelationshipState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const id = String(formData.get("id") ?? "");
  const parsed = RelationshipSchema.safeParse({
    entityName: formData.get("entityName"),
    category: formData.get("category"),
    visibility: formData.get("visibility") || "PUBLIC",
    connectionDegree: formData.get("connectionDegree") || "FIRST",
    relevanceNote: formData.get("relevanceNote") || undefined,
    periodLabel: formData.get("periodLabel") || undefined,
  });
  if (!parsed.success || !id) return { error: "Invalid relationship." };

  // Only the owner can update.
  const existing = await getRelationshipIfOwned(id, user.id);
  if (!existing) return { error: "Relationship not found." };

  await updateRelationshipFields(id, {
    entity_name: parsed.data.entityName,
    category: parsed.data.category,
    visibility: parsed.data.visibility,
    connection_degree: parsed.data.connectionDegree,
    relevance_note: parsed.data.relevanceNote || null,
    period_label: parsed.data.periodLabel || null,
  });

  revalidatePath("/dashboard/relationships");
  return { success: true };
}