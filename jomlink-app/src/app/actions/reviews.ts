"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionByOpportunity,
  getOpportunityById,
  getReviewByAuthorAndOpportunity,
  createReview,
  getReviewsForSubject,
  getReputationByUserId,
  upsertReputation,
} from "@/lib/queries";
import type { ReviewRow } from "@/lib/jomlink-types";

const ReviewSchema = z.object({
  opportunityId: z.string().min(1),
  subjectId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

export type ReviewState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/** One review per (author, opportunity). Recomputes subject's average rating. */
export async function submitReviewAction(
  prevState: ReviewState | undefined,
  formData: FormData
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = ReviewSchema.safeParse({
    opportunityId: formData.get("opportunityId"),
    subjectId: formData.get("subjectId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { opportunityId, subjectId, rating, comment } = parsed.data;
  if (subjectId === user.id) {
    return { error: "You cannot review yourself." };
  }

  // A review is only valid for a COMPLETED connection, and only by one of its
  // two parties. Without this the form (or a direct POST) could rate anyone.
  const conn = await getConnectionByOpportunity(opportunityId);
  if (!conn) {
    return { error: "Connection not found." };
  }
  const opp = await getOpportunityById(opportunityId);
  if (!opp) {
    return { error: "Opportunity not found." };
  }
  const isLinker = conn.linker_id === user.id;
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) {
    return { error: "You are not part of this connection." };
  }
  if (conn.status !== "COMPLETED") {
    return { error: "You can only review a completed connection." };
  }
  // The subject must be the counterparty — never an arbitrary member.
  const counterpartyId = isLinker ? opp.seeker_id : conn.linker_id;
  if (subjectId !== counterpartyId) {
    return { error: "You can only review your counterparty on this connection." };
  }

  // One review per (author, opportunity).
  const existing = await getReviewByAuthorAndOpportunity(user.id, opportunityId);
  if (existing) {
    return { error: "You have already reviewed this connection." };
  }

  try {
    await createReview({
      opportunity_id: opportunityId,
      author_id: user.id,
      subject_id: subjectId,
      rating,
      comment: comment || null,
    });

    // Recompute subject's average rating across all their reviews.
    const reviews = (await getReviewsForSubject(subjectId)) as ReviewRow[];
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 100) / 100
      : rating;
    const rep = await getReputationByUserId(subjectId);
    await upsertReputation(subjectId, {
      average_rating: avg,
      completed_count: rep?.completed_count ?? 0,
      successful_count: rep?.successful_count ?? 0,
      success_rate: rep?.success_rate ?? 0,
      response_rate: rep?.response_rate ?? 0,
      cancellation_count: rep?.cancellation_count ?? 0,
      dispute_count: rep?.dispute_count ?? 0,
      on_time_count: rep?.on_time_count ?? 0,
    });

    revalidatePath("/opportunities/" + opportunityId);
    revalidatePath("/members/" + subjectId);
    return { success: true };
  } catch (e: unknown) {
    console.error("submitReviewAction error", e);
    return { error: "Could not submit your review." };
  }
}