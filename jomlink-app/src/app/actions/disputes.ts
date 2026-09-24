"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import {
  getConnectionById,
  getOpportunityById,
  createDispute,
  updateDispute,
  getDisputeById,
  updateConnection,
  updateOpportunityAdmin,
  createTransaction,
  recordLedgerEntries,
  createPayout,
  createRefund,
  getReputationByUserId,
  upsertReputation,
} from "@/lib/queries";
import { accounts, doubleEntry } from "@/lib/ledger";
import { calculateLinkerPayout, roundMoney } from "@/lib/funding";

export async function raiseDisputeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const connectionId = formData.get("connectionId") as string;
  const reason = (formData.get("reason") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const evidence = (formData.get("evidence") as string)?.trim() || null;

  if (!connectionId || !reason) {
    throw new Error("Connection ID and dispute reason are required");
  }

  const conn = await getConnectionById(connectionId);
  if (!conn) {
    throw new Error("Connection not found");
  }

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) {
    throw new Error("Opportunity not found");
  }

  const isSeeker = opp.seeker_id === user.id;
  const isLinker = conn.linker_id === user.id;

  if (!isSeeker && !isLinker && user.role !== "ADMIN") {
    throw new Error("Only the Seeker or Linker of this connection may raise a dispute");
  }

  // 1. Create dispute record
  const dispute = await createDispute({
    opportunity_id: opp.id,
    connection_id: conn.id,
    raised_by_id: user.id,
    reason,
    description,
    evidence,
    status: "OPEN",
  });

  // 2. Put payout on HOLD and set connection & opportunity to DISPUTED
  await updateConnection(conn.id, {
    status: "DISPUTED",
    release_status: "HELD",
  });

  await updateOpportunityAdmin(opp.id, {
    status: "DISPUTED",
  });

  // 3. Update dispute count on reputation
  const targetId = isSeeker ? conn.linker_id : opp.seeker_id;
  const rep = await getReputationByUserId(targetId);
  await upsertReputation(targetId, {
    dispute_count: (rep?.dispute_count ?? 0) + 1,
  });

  // 4. Record audit log
  await recordAuditLog({
    adminId: user.role === "ADMIN" ? user.id : null,
    action: AUDIT_ACTIONS.DISPUTE_RAISED,
    entity: "DISPUTE",
    entityId: dispute.id,
    details: {
      opportunityId: opp.id,
      connectionId: conn.id,
      raisedBy: user.email,
      reason,
    },
  });

  revalidatePath(`/dashboard/connections/${conn.id}`);
  revalidatePath(`/admin/disputes`);
  revalidatePath(`/admin`);
}

export async function updateDisputeStatusAction(formData: FormData) {
  const admin = await requireAdmin("disputes:read");
  const disputeId = formData.get("disputeId") as string;
  const status = formData.get("status") as "OPEN" | "UNDER_REVIEW" | "CLOSED";

  if (!disputeId || !status) {
    throw new Error("Dispute ID and status required");
  }

  await updateDispute(disputeId, { status });

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.DISPUTE_UNDER_REVIEW,
    entity: "DISPUTE",
    entityId: disputeId,
    details: { status, updatedBy: admin.user.email },
  });

  revalidatePath("/admin/disputes");
}

export async function resolveDisputeAction(formData: FormData) {
  const admin = await requireAdmin("disputes:resolve");
  const disputeId = formData.get("disputeId") as string;
  const outcome = formData.get("outcome") as
    | "COMPLETED"
    | "REFUNDED"
    | "PARTIALLY_COMPLETED"
    | "FAILED"
    | "OTHER";
  const resolutionNote = (formData.get("resolutionNote") as string) || "Resolved by administrator";

  if (!disputeId || !outcome) {
    throw new Error("Dispute ID and resolution outcome are required");
  }

  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    throw new Error("Dispute not found");
  }

  const opp = await getOpportunityById(dispute.opportunity_id);
  if (!opp) {
    throw new Error("Opportunity not found");
  }

  const conn = dispute.connection_id ? await getConnectionById(dispute.connection_id) : null;
  const escrowTotal = roundMoney(Number(opp.funded_amount ?? opp.offer_amount));

  // Settlement accounting
  if (outcome === "REFUNDED" || outcome === "FAILED") {
    // 100% refund of escrow to Seeker
    if (escrowTotal > 0) {
      const refundTxn = await createTransaction({
        user_id: opp.seeker_id,
        opportunity_id: opp.id,
        connection_id: conn?.id ?? null,
        type: "REFUND",
        status: "COMPLETED",
        amount: escrowTotal,
        currency: opp.currency,
        description: `Dispute resolution refund: ${resolutionNote}`,
      });

      const entries = doubleEntry(
        accounts.escrow(opp.id),
        accounts.seeker(opp.seeker_id),
        escrowTotal
      );
      if (entries.length > 0) {
        await recordLedgerEntries(refundTxn.id, entries);
      }

      await createRefund({
        transaction_id: refundTxn.id,
        recipient_id: opp.seeker_id,
        amount: escrowTotal,
        reason: resolutionNote,
        status: "COMPLETED",
        approved_by: admin.user.id,
      });
    }

    if (conn) {
      await updateConnection(conn.id, {
        status: "FAILED",
        release_status: "REFUNDED",
      });
    }
    await updateOpportunityAdmin(opp.id, { status: "FAILED" });
  } else if (outcome === "COMPLETED") {
    // Full release to Linker
    const reward = conn?.agreed_reward ? Number(conn.agreed_reward) : Number(opp.offer_amount);
    const { netPayout, serviceFee } = calculateLinkerPayout(reward);

    const releaseTxn = await createTransaction({
      user_id: conn ? conn.linker_id : opp.seeker_id,
      opportunity_id: opp.id,
      connection_id: conn?.id ?? null,
      type: "REWARD_RELEASE",
      status: "COMPLETED",
      amount: reward,
      fee_raw: serviceFee,
      currency: opp.currency,
      description: `Dispute resolution reward release: ${resolutionNote}`,
    });

    const entries = [
      ...doubleEntry(accounts.escrow(opp.id), accounts.linker(conn ? conn.linker_id : ""), netPayout),
      ...doubleEntry(accounts.escrow(opp.id), accounts.platformService, serviceFee),
    ];
    if (entries.length > 0) {
      await recordLedgerEntries(releaseTxn.id, entries);
    }

    if (conn) {
      await createPayout({
        transaction_id: releaseTxn.id,
        recipient_id: conn.linker_id,
        amount: reward,
        service_fee: serviceFee,
        net_amount: netPayout,
        status: "RELEASED",
        released_at: new Date().toISOString(),
      });

      await updateConnection(conn.id, {
        status: "COMPLETED",
        release_status: "RELEASED",
        completed_at: new Date().toISOString(),
      });
    }
    await updateOpportunityAdmin(opp.id, { status: "COMPLETED" });
  } else if (outcome === "PARTIALLY_COMPLETED") {
    // 50/50 split or custom split
    const splitAmount = roundMoney(escrowTotal / 2);
    if (splitAmount > 0) {
      // Refund half to Seeker
      const refundTxn = await createTransaction({
        user_id: opp.seeker_id,
        opportunity_id: opp.id,
        connection_id: conn?.id ?? null,
        type: "REFUND",
        status: "COMPLETED",
        amount: splitAmount,
        currency: opp.currency,
        description: `Partial dispute settlement refund: ${resolutionNote}`,
      });
      await recordLedgerEntries(
        refundTxn.id,
        doubleEntry(accounts.escrow(opp.id), accounts.seeker(opp.seeker_id), splitAmount)
      );

      // Release half to Linker
      if (conn) {
        const { netPayout, serviceFee } = calculateLinkerPayout(splitAmount);
        const releaseTxn = await createTransaction({
          user_id: conn.linker_id,
          opportunity_id: opp.id,
          connection_id: conn.id,
          type: "REWARD_RELEASE",
          status: "COMPLETED",
          amount: splitAmount,
          fee_raw: serviceFee,
          currency: opp.currency,
          description: `Partial dispute settlement payout: ${resolutionNote}`,
        });
        await recordLedgerEntries(releaseTxn.id, [
          ...doubleEntry(accounts.escrow(opp.id), accounts.linker(conn.linker_id), netPayout),
          ...doubleEntry(accounts.escrow(opp.id), accounts.platformService, serviceFee),
        ]);
        await createPayout({
          transaction_id: releaseTxn.id,
          recipient_id: conn.linker_id,
          amount: splitAmount,
          service_fee: serviceFee,
          net_amount: netPayout,
          status: "RELEASED",
          released_at: new Date().toISOString(),
        });

        await updateConnection(conn.id, {
          status: "COMPLETED",
          release_status: "RELEASED",
        });
      }
    }
    await updateOpportunityAdmin(opp.id, { status: "COMPLETED" });
  }

  // Update dispute status
  await updateDispute(disputeId, {
    status: "RESOLVED",
    outcome,
    resolution_note: resolutionNote,
    resolved_by: admin.user.id,
    resolved_at: new Date().toISOString(),
  });

  // Audit log
  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.DISPUTE_RESOLVED,
    entity: "DISPUTE",
    entityId: disputeId,
    details: {
      outcome,
      resolutionNote,
      resolvedBy: admin.user.email,
      escrowSettled: escrowTotal,
    },
  });

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/transactions");
  revalidatePath(`/dashboard/connections/${conn?.id}`);
}

