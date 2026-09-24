"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addBusinessProfile,
  removeBusinessProfile,
  toggleRole,
  type BusinessState,
} from "@/app/actions/profile";
import type { BusinessProfileRow, JomlinkUserRow } from "@/lib/jomlink-types";

const initialState: BusinessState = {};
const ROLE = "BOTH" as const;

const OBJECTIVES = [
  "Seeking corporate clients",
  "Seeking strategic partners",
  "Seeking investors",
  "Seeking distribution partners",
];

export function BusinessSection({ items, currentRole }: { items: BusinessProfileRow[]; currentRole: string }) {
  const [state, action, pending] = useActionState<BusinessState, FormData>(
    addBusinessProfile,
    initialState
  );

  return (
    <div className="space-y-6">
      {/* Role selector */}
      <form action={toggleRole} className="rounded-lg border border-border bg-card p-4">
        <Label>I want to use Jomlink as</Label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {[
            { value: "SEEKER", label: "Seeker — find connections" },
            { value: "LINKER", label: "Linker — provide introductions" },
            { value: "BOTH", label: "Both" },
          ].map((r) => (
            <button
              key={r.value}
              type="submit"
              name="role"
              value={r.value}
              aria-pressed={currentRole === r.value}
              className={
                (currentRole === r.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50") +
                " inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
              }
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              {r.label}
            </button>
          ))}
        </div>
      </form>

      {/* Existing business profiles */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  {b.industry && <p className="text-sm text-muted-foreground">{b.industry}</p>}
                </div>
                <form action={removeBusinessProfile}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" aria-label="Remove business" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
              {b.description && <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add business profile */}
      <form action={action} className="rounded-lg border border-border bg-card p-4 space-y-4">
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Business profile added.</p>}
        <h3 className="font-semibold">Add a business profile</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" required placeholder="e.g. ABC Technology Sdn Bhd" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" placeholder="e.g. Technology" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={2} className="resize-y" placeholder="What does your business do?" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" name="website" placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label>Business objectives</Label>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map((o) => (
              <label key={o} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
                <input type="checkbox" name="objectives" value={o} className="sr-only" />
                {o}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Add business
        </Button>
      </form>
    </div>
  );
}