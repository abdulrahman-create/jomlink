import { NextResponse, type NextRequest } from "next/server";
import { getPendingTopUpTransactions } from "@/lib/queries";
import { settleTopUp } from "@/lib/payments";

/**
 * Wallet top-up reconciliation.
 *
 * Safety net for top-ups stuck in PENDING: if both the callback and the return
 * leg were missed (localhost dev, gateway hiccup, member closed the tab), this
 * sweeps every PENDING WALLET_CREDIT row and asks ToyyibPay whether the bill
 * was actually paid — crediting it if so, marking it FAILED if it was not.
 *
 * Trigger it from a cron (e.g. every 15 min) or manually:
 *   curl -H "x-reconcile-secret: $RECONCILE_SECRET" https://app/api/payments/toyyibpay/reconcile
 *
 * Auth: when RECONCILE_SECRET is set, the `x-reconcile-secret` header must match.
 * When it is unset (local dev), the endpoint is open.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.RECONCILE_SECRET;
  if (secret) {
    const provided = request.headers.get("x-reconcile-secret");
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let pending;
  try {
    pending = await getPendingTopUpTransactions();
  } catch (e) {
    console.error("reconcile: could not list pending top-ups", e);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const results = { checked: 0, credited: 0, failed: 0, stillPending: 0 };

  for (const tx of pending) {
    results.checked++;
    try {
      const r = await settleTopUp(tx, tx.gateway_ref ?? undefined, true);
      if (r.outcome === "credited") results.credited++;
      else if (r.outcome === "failed") results.failed++;
      else results.stillPending++;
    } catch (e) {
      console.error("reconcile: settle failed for", tx.id, e);
      results.stillPending++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
