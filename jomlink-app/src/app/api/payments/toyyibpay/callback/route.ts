import { NextResponse, type NextRequest } from "next/server";
import { verifyCallbackHash, PAYMENT_STATUS } from "@/lib/toyyibpay";
import {
  findPaymentTransaction,
  updateTransactionStatus,
} from "@/lib/queries";
import { creditVerifiedTopUp } from "@/lib/payments";

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

  // 2) Only "1" (success) is acted on here. Pending ("2"/"4") is left alone —
  //    the reconcile job or a later callback/return will finish it. Fail ("3")
  //    is recorded as FAILED so the wallet stops showing a stuck pending top-up.
  if (status !== PAYMENT_STATUS.SUCCESS) {
    if (status === PAYMENT_STATUS.FAIL) {
      const failed = await findPaymentTransaction({ billCode: billcode, orderId });
      if (failed && failed.status === "PENDING") {
        await updateTransactionStatus(failed.id, "FAILED");
      }
    }
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  // 3) Find our pending transaction by the gateway bill code (always echoed
  //    back), falling back to the external reference (`order_id`) for older rows.
  const tx = await findPaymentTransaction({ billCode: billcode, orderId });
  if (!tx) {
    console.error("toyyibpay callback: no transaction found", {
      billcode,
      orderId,
    });
    return NextResponse.json({ ok: false, error: "Unknown reference" }, { status: 404 });
  }

  // 4) The hash already proved payment — credit the wallet exactly once.
  const result = await creditVerifiedTopUp(tx);
  return NextResponse.json({ ok: true, outcome: result.outcome });
}
