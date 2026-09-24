/**
 * Route-level loading skeleton for the member dashboard.
 * Uses a subtle pulse that is disabled under prefers-reduced-motion (see globals.css).
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="h-40 animate-pulse rounded-xl bg-muted" />

      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-6">
            <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
