"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addEmployment,
  removeEmployment,
  type EmploymentState,
} from "@/app/actions/profile";
import type { EmploymentRow } from "@/lib/jomlink-types";
import { formatDate } from "@/lib/constants";

const initialState: EmploymentState = {};

export function EmploymentSection({ items }: { items: EmploymentRow[] }) {
  const [state, action, pending] = useActionState<EmploymentState, FormData>(
    addEmployment,
    initialState
  );

  return (
    <div className="space-y-5">
      <h3 className="font-semibold">Employment History</h3>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((job) => (
            <li key={job.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted p-3">
              <div>
                <p className="text-sm font-semibold">{job.position}</p>
                <p className="text-sm text-muted-foreground">{job.organisation}</p>
                {job.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {job.current
                    ? "Current"
                    : job.start_date
                    ? `${formatDate(job.start_date)} — ${job.end_date ? formatDate(job.end_date) : "present"}`
                    : ""}
                </p>
              </div>
              <form action={removeEmployment}>
                <input type="hidden" name="id" value={job.id} />
                <button type="submit" aria-label={`Remove ${job.position}`} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="rounded-lg border border-border bg-card p-4 space-y-4">
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Added.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organisation">Organisation</Label>
            <Input id="organisation" name="organisation" placeholder="e.g. Sime Darby Berhad" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" name="position" placeholder="e.g. Senior Manager" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" name="endDate" type="date" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="current" className="h-4 w-4 rounded border-border text-primary" />
          I currently work here
        </label>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" rows={2} className="resize-y" />
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Add position
        </Button>
      </form>
    </div>
  );
}