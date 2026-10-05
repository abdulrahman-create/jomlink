import { NextResponse, type NextRequest } from "next/server";
import { PAYMENT_STATUS } from "@/lib/toyyibpay";
import { findPaymentTransaction, updateTransactionStatus } from "@/lib/queries";
import { settleTopUp } from "@/lib/payments";

/**
 * ToyyibPay return URL — the member is redirected here after paying.
 *
 * ToyyibPay supplies `status_id`, `billcode` and `order_id` as GET params.
 * We re-verify against the API (never trust the redirect alone), credit the
 * wallet if paid, then send the member back to their wallet.
 *
 * This doubles as the confirmation path in local development, where ToyyibPay
 * cannot reach the server-to-server callback on localhost.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusId = searchParams.get("status_id") ?? "";
  const billcode = searchParams.get("billcode") ?? "";
  const orderId = searchParams.get("order_id") ?? "";

  const walletUrl = new URL("/dashboard/wallet", request.url);

  // Resolve our transaction by the gateway bill code (always present) or the
  // external reference. NOTE: `order_id` may be empty — never hard-fail on it.
  if (!billcode && !orderId) {
    walletUrl.searchParams.set("payment", "unknown");
    return NextResponse.redirect(walletUrl);
  }

  try {
    const tx = await findPaymentTransaction({ billCode: billcode, orderId });
    if (!tx) {
      walletUrl.searchParams.set("payment", "unknown");
      return NextResponse.redirect(walletUrl);
    }

    // Already credited (callback beat us here) — nothing to do.
    if (tx.status === "COMPLETED") {
      walletUrl.searchParams.set("payment", "success");
      return NextResponse.redirect(walletUrl);
    }

    // An explicit failure from the gateway → mark FAILED, don't leave pending.
    if (statusId === PAYMENT_STATUS.FAIL) {
      if (tx.status === "PENDING") await updateTransactionStatus(tx.id, "FAILED");
      walletUrl.searchParams.set("payment", "failed");
      return NextResponse.redirect(walletUrl);
    }

    // Otherwise verify against the API and settle (paid → credit, else pending).
    const result = await settleTopUp(tx, billcode, true);
    walletUrl.searchParams.set(
      "payment",
      result.outcome === "credited" || result.outcome === "already"
        ? "success"
        : result.outcome === "failed"
        ? "failed"
        : "pending"
    );
    return NextResponse.redirect(walletUrl);
  } catch (e) {
    console.error("toyyibpay return handler error", e);
    walletUrl.searchParams.set("payment", "error");
    return NextResponse.redirect(walletUrl);
  }
}
