import { roundMoney } from "@/lib/funding";

/**
 * Jomlink Double-Entry Ledger Helpers
 *
 * Every money movement is recorded as a pair of entries in `transaction_ledger`:
 * a DEBIT on one account and a CREDIT on another, so the books always balance.
 *
 * Account naming convention (simple, auditable):
 *   • `seeker:{userId}`        — Seeker's wallet / escrow
 *   • `linker:{userId}`        — Linker's wallet
 *   • `wallet:{userId}`        — Member's wallet balance (top-ups / debits)
 *   • `external:funding`       — Outside money entering the platform (top-ups)
 *   • `platform:activation`  — Platform activation-fee income
 *   • `platform:service`     — Platform linker-service-fee income
 *   • `escrow:{opportunityId}` — Escrow holding account for an opportunity
 */

export interface LedgerEntry {
  account: string;
  debit: number; // money out of this account
  credit: number; // money into this account
}

/**
 * Build a balanced pair of ledger entries for a money movement.
 * `from` is debited, `to` is credited, both by `amount`.
 */
export function doubleEntry(
  from: string,
  to: string,
  amount: number
): LedgerEntry[] {
  const amt = roundMoney(amount);
  if (amt <= 0) return [];
  return [
    { account: from, debit: amt, credit: 0 },
    { account: to, debit: 0, credit: amt },
  ];
}

/** Convenience account names. */
export const accounts = {
  seeker: (id: string) => `seeker:${id}`,
  linker: (id: string) => `linker:${id}`,
  wallet: (id: string) => `wallet:${id}`,
  escrow: (id: string) => `escrow:${id}`,
  externalFunding: "external:funding",
  platformActivation: "platform:activation",
  platformService: "platform:service",
} as const;

/** Human label for an account (for the wallet UI). */
export function accountLabel(account: string): string {
  if (account.startsWith("seeker:")) return "Seeker wallet";
  if (account.startsWith("linker:")) return "Linker wallet";
  if (account.startsWith("wallet:")) return "Member wallet";
  if (account.startsWith("escrow:")) return "Escrow (opportunity)";
  if (account === accounts.externalFunding) return "External funding source";
  if (account === accounts.platformActivation) return "Platform · activation fees";
  if (account === accounts.platformService) return "Platform · service fees";
  return account;
}