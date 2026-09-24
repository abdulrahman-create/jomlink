import { createHash } from "crypto";

/**
 * ToyyibPay payment gateway client (server-only).
 *
 * Docs: https://toyyibpay.com/apireference/
 *
 * Environment:
 *   • Sandbox → https://dev.toyyibpay.com  (register at dev.toyyibpay.com)
 *   • Live    → https://toyyibpay.com
 *
 * IMPORTANT: the secret key is server-only. Never expose it to the browser.
 * Sandbox and live credentials are NOT interchangeable — a sandbox key sent to
 * the live endpoint returns [KEY-DID-NOT-EXIST].
 */

const BASE_URL =
  process.env.TOYYIBPAY_BASE_URL?.replace(/\/$/, "") ??
  "https://dev.toyyibpay.com";

export const TOYYIBPAY_IS_SANDBOX = BASE_URL.includes("dev.toyyibpay.com");

function secretKey(): string {
  const key = process.env.TOYYIBPAY_SECRET_KEY;
  if (!key) {
    throw new Error(
      "TOYYIBPAY_SECRET_KEY is not set. Add it to .env.local (server-only)."
    );
  }
  return key;
}

function categoryCode(): string {
  const code = process.env.TOYYIBPAY_CATEGORY_CODE;
  if (!code) {
    throw new Error(
      "TOYYIBPAY_CATEGORY_CODE is not set. Create a category in the ToyyibPay dashboard."
    );
  }
  return code;
}

/** Public URL of this app, used for return/callback URLs. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/**
 * ToyyibPay returns HTTP 200 for BOTH success and failure. Always inspect the
 * body — never rely on the status code.
 */
async function post(
  path: string,
  data: Record<string, string>
): Promise<{ status: number; text: string }> {
  const res = await fetch(`${BASE_URL}/index.php/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
    cache: "no-store",
  });
  return { status: res.status, text: (await res.text()).trim() };
}

export interface CreateBillParams {
  /** Bill title — max 30 alphanumeric chars, space and underscore only. */
  billName: string;
  /** Max 100 alphanumeric chars, space and underscore only. */
  billDescription: string;
  /** Amount in MYR (converted to cents internally). */
  amount: number;
  /** Your own reference — used to reconcile the payment. */
  externalReferenceNo: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  /** 0 = FPX only, 1 = card only, 2 = both. */
  paymentChannel?: "0" | "1" | "2";
  /** Days until the bill expires (1–100). */
  expiryDays?: number;
}

export interface CreateBillResult {
  ok: boolean;
  billCode?: string;
  paymentUrl?: string;
  error?: string;
}

/**
 * Creates a bill and returns its code + hosted payment URL.
 *
 * `billAmount` is in CENTS (100 = RM1.00).
 */
export async function createBill(
  params: CreateBillParams
): Promise<CreateBillResult> {
  const cents = Math.round(params.amount * 100);
  if (cents < 100) {
    return { ok: false, error: "Amount must be at least RM1.00." };
  }

  const { text } = await post("createBill", {
    userSecretKey: secretKey(),
    categoryCode: categoryCode(),
    billName: params.billName.slice(0, 30),
    billDescription: params.billDescription.slice(0, 100),
    billPriceSetting: "1", // fixed amount
    billPayorInfo: "1", // require payer info
    billAmount: String(cents),
    billReturnUrl: `${appUrl()}/api/payments/toyyibpay/return`,
    billCallbackUrl: `${appUrl()}/api/payments/toyyibpay/callback`,
    billExternalReferenceNo: params.externalReferenceNo,
    billTo: params.payerName ?? "",
    billEmail: params.payerEmail ?? "",
    billPhone: params.payerPhone ?? "",
    billPaymentChannel: params.paymentChannel ?? "2",
    billChargeToCustomer: "0", // charge FPX to customer
    billExpiryDays: String(params.expiryDays ?? 3),
  });

  // Success: [{"BillCode":"abc123"}]
  try {
    const parsed = JSON.parse(text);
    const code = Array.isArray(parsed) ? parsed[0]?.BillCode : undefined;
    if (code) {
      return { ok: true, billCode: code, paymentUrl: `${BASE_URL}/${code}` };
    }
  } catch {
    /* fall through to error handling */
  }

  // Failure: {"status":"error","msg":"..."} or a plain-text code like
  // [KEY-DID-NOT-EXIST] / [CATEGORY-NOT-MATCH] / [FALSE]
  let message = text || "Unknown ToyyibPay error.";
  try {
    const parsed = JSON.parse(text);
    if (parsed?.msg) message = parsed.msg;
  } catch {
    /* plain text */
  }
  return { ok: false, error: message };
}

export interface BillTransaction {
  billName?: string;
  billStatus?: string;
  billpaymentStatus?: string;
  billpaymentChannel?: string;
  billpaymentAmount?: string;
  billpaymentInvoiceNo?: string;
  billPaymentDate?: string;
  billExternalReferenceNo?: string;
}

/**
 * Fetches transactions for a bill. Use this to confirm payment server-side
 * rather than trusting the return URL alone.
 */
export async function getBillTransactions(
  billCode: string,
  paymentStatus?: "1" | "2" | "3" | "4"
): Promise<BillTransaction[]> {
  const { text } = await post("getBillTransactions", {
    billCode,
    billpaymentStatus: paymentStatus ?? "",
  });
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Verifies the MD5 hash on a ToyyibPay callback.
 *
 * Formula (from the docs):
 *   MD5( userSecretKey + status + order_id + refno + "ok" )
 *
 * Always validate before treating a callback as a real payment.
 */
export function verifyCallbackHash(params: {
  status: string;
  orderId: string;
  refno: string;
  hash: string;
}): boolean {
  const expected = createHash("md5")
    .update(
      `${secretKey()}${params.status}${params.orderId}${params.refno}ok`
    )
    .digest("hex");
  return expected === params.hash;
}

/** ToyyibPay payment status codes. */
export const PAYMENT_STATUS = {
  SUCCESS: "1",
  PENDING: "2",
  FAIL: "3",
} as const;
