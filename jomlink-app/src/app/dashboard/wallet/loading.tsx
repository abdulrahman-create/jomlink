/**
 * Route-level loading skeleton for the wallet page.
 * Pulse is disabled under prefers-reduced-motion (see globals.css).
 */
export default function WalletLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading wallet…</span>
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
