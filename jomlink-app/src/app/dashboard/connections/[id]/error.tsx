"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for a single connection.
 *
 * Why this exists: the page loads nine datasets in one `Promise.all`, so a single
 * failing query rejects the whole render and Next.js replaces the page with a
 * generic overlay. Supabase returns its failures as plain objects
 * (`{ code, details, hint, message }`) rather than `Error` instances, and those
 * have no `stack` — so the default overlay could only dump the raw object, which
 * told the member nothing actionable.
 *
 * This boundary absorbs the throw, keeps the member inside the dashboard, and
 * surfaces the underlying code/message so a real failure can be reported. The
 * related connection list stays reachable because only this segment is replaced.
 */
export default function ConnectionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[connection-detail] render failed:", error);
  }, [error]);

  // Supabase errors are thrown as plain objects (see queries.ts), so the useful
  // fields live on the object itself rather than on an Error instance.
  const raw = error as unknown as { code?: string; message?: string; hint?: string };
  const code = raw?.code;
  const detail = raw?.message ?? error?.message;
  const hint = raw?.hint;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/connections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to connections
      </Link>

      <div
        role="alert"
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold tracking-tight">
              We couldn&apos;t load this connection
            </h1>
            <p className="text-sm text-muted-foreground">
              Something went wrong while fetching this connection&apos;s details.
              This is usually temporary — try again, and if it keeps happening the
              reference below will help us trace it.
            </p>

            {(detail || code) && (
              <p className="pt-1 font-mono text-xs text-muted-foreground">
                {code ? `${code}: ` : ""}
                {detail}
              </p>
            )}
            {hint && (
              <p className="font-mono text-xs text-muted-foreground">{hint}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={reset} size="sm">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/connections">Back to connections</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
