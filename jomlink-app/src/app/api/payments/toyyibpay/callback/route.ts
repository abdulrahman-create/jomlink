import { NextResponse, type NextRequest } from "next/server";
import {
  verifyCallbackHash,
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
 * ToyyibPay server-to-server callback.
 *
 * ToyyibPay POSTs here on payment success/failure. We MUST verify the MD5 hash
 * before trusting anything, then credit the wallet exactly once.
 *
 * NOTE: ToyyibPay cannot reach localhost — use a tunnel (ngrok/cloudflared) in
 * development. The return URL handler also confirms payment as a fallback.
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const status = String(form.get("status") ?? "");
  const refno = String(form.get("refno") ?? "");
  const orderId = String(form.get("order_id") ?? "");
  const billcode = String(form.get("billcode") ?? "");
  const hash = String(form.get("hash") ?? "");

  // 1) Verify the hash — reject anything that fails.
  if (!hash || !verifyCallbackHash({ status, orderId, refno, hash })) {
    console.error("toyyibpay callback: hash verification failed", {
      orderId,
      billcode,
    });
    return NextResponse.json({ ok: false, error: "Invalid hash" }, { status: 401 });
  }

  // 2) Only act on success.
  if (status !== PAYMENT_STATUS.SUCCESS) {
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  // 3) Find our pending transaction by the external reference.
  const tx = orderId ? await getTransactionByReference(orderId) : null;
  if (!tx) {
    console.error("toyyibpay callback: no transaction for reference", orderId);
    return NextResponse.json({ ok: false, error: "Unknown reference" }, { status: 404 });
  }

  // 4) Idempotency — never credit twice.
  if (tx.status === "COMPLETED") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  // 5) Cross-check with ToyyibPay's own records before crediting.
  const billTx = await getBillTransactions(billcode, PAYMENT_STATUS.SUCCESS);
  const confirmed = billTx.some(
    (t) => t.billpaymentStatus === PAYMENT_STATUS.SUCCESS
  );
  if (!confirmed) {
    console.error("toyyibpay callback: bill not confirmed paid", billcode);
    return NextResponse.json({ ok: false, error: "Not confirmed" }, { status: 409 });
  }

  // 6) Credit the wallet: external funding → member wallet.
  const amount = Number(tx.amount);
  await updateTransactionStatus(tx.id, "COMPLETED");
  for (const e of doubleEntry(
    accounts.externalFunding,
    accounts.wallet(tx.user_id),
    amount
  )) {
    await createLedgerEntry({ transaction_id: tx.id, ...e });
  }

  return NextResponse.json({ ok: true, credited: amount });
}
