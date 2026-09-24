"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RELATIONSHIP_CATEGORIES } from "@/lib/constants";
import { addRelationship, removeRelationship, type RelationshipState } from "@/app/actions/relationships";
import type { RelationshipRow } from "@/lib/jomlink-types";

const initialState: RelationshipState = {};

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public — visible to everyone" },
  { value: "PLATFORM_ONLY", label: "Platform-only — used for matching, not shown" },
  { value: "OPPORTUNITY_SPECIFIC", label: "Opportunity-specific — shown when relevant" },
];

const DEGREE_OPTIONS = [
  { value: "FIRST", label: "1st degree — direct relationship" },
  { value: "SECOND", label: "2nd degree — through someone I know" },
  { value: "THIRD", label: "3rd degree — requires an intermediary" },
];

const CATEGORY_LABEL = Object.fromEntries(
  RELATIONSHIP_CATEGORIES.map((c) => [c.value, c.label])
);

export function RelationshipsSection({ items }: { items: RelationshipRow[] }) {
  const [state, action, pending] = useActionState<RelationshipState, FormData>(
    addRelationship,
    initialState
  );

  return (
    <div className="space-y-6">
      {/* Existing declarations */}
      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.entity_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </p>
                </div>
                <form action={removeRelationship}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" aria-label="Remove relationship" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
              {r.relevance_note && (
                <p className="mt-2 text-sm text-muted-foreground">{r.relevance_note}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">{r.connection_degree} degree</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{r.visibility.replace(/_/g, " ").toLowerCase()}</span>
                {r.verified ? (
                  <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified</Badge>
                ) : (
                  <Badge variant="outline">Unverified</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No relationships declared yet. Add your first one below.
        </p>
      )}

      <form action={action} className="rounded-lg border border-border bg-card p-4 space-y-4">
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Relationship added.</p>}

        <div>
          <Label htmlFor="entityName">Organisation / entity</Label>
          <Input id="entityName" name="entityName" required placeholder="e.g. Prasarana Malaysia Berhad" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Relationship type</Label>
            <Select id="category" name="category" required placeholder="Select relationship type">
              {RELATIONSHIP_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="connectionDegree">Connection degree</Label>
            <Select id="connectionDegree" name="connectionDegree" defaultValue="FIRST">
              {DEGREE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select id="visibility" name="visibility" defaultValue="PUBLIC">
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relevanceNote">Relevance note (optional)</Label>
          <Textarea id="relevanceNote" name="relevanceNote" rows={2} placeholder="e.g. Worked with the corporate affairs division" className="resize-y" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodLabel">Period (optional)</Label>
          <Input id="periodLabel" name="periodLabel" placeholder="e.g. 2015–2020" />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Add relationship
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        🔒 Your personal contact details are never made public. Relationships are shown
        as&nbsp;<em>“Organisation — Relationship type”</em> only.
      </p>
    </div>
  );
}