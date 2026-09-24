import { NextResponse, type NextRequest } from "next/server";
import {
  getBillTransactions,
  PAYMENT_STATUS,
} from "@/lib/toyyibpay";
import {
  getTransactionByReference,
  updateTransactionStatus,
  createLedgerEntry,
} from "@/lib/queries";
import { doubleEntry, accounts } from "@/lib/ledger";

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

  if (statusId !== PAYMENT_STATUS.SUCCESS || !billcode || !orderId) {
    walletUrl.searchParams.set("payment", "failed");
    return NextResponse.redirect(walletUrl);
  }

  try {
    const tx = await getTransactionByReference(orderId);
    if (!tx) {
      walletUrl.searchParams.set("payment", "unknown");
      return NextResponse.redirect(walletUrl);
    }

    // Already credited (callback beat us here) — nothing to do.
    if (tx.status === "COMPLETED") {
      walletUrl.searchParams.set("payment", "success");
      return NextResponse.redirect(walletUrl);
    }

    // Confirm with ToyyibPay before crediting.
    const billTx = await getBillTransactions(billcode, PAYMENT_STATUS.SUCCESS);
    const confirmed = billTx.some(
      (t) => t.billpaymentStatus === PAYMENT_STATUS.SUCCESS
    );
    if (!confirmed) {
      walletUrl.searchParams.set("payment", "pending");
      return NextResponse.redirect(walletUrl);
    }

    const amount = Number(tx.amount);
    await updateTransactionStatus(tx.id, "COMPLETED");
    for (const e of doubleEntry(
      accounts.externalFunding,
      accounts.wallet(tx.user_id),
      amount
    )) {
      await createLedgerEntry({ transaction_id: tx.id, ...e });
    }

    walletUrl.searchParams.set("payment", "success");
    return NextResponse.redirect(walletUrl);
  } catch (e) {
    console.error("toyyibpay return handler error", e);
    walletUrl.searchParams.set("payment", "error");
    return NextResponse.redirect(walletUrl);
  }
}
