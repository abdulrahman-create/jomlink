"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  submitProposalAction,
  type ProposalState,
} from "@/app/actions/proposals";
import type { RelationshipRow, LinkerProposalRow } from "@/lib/jomlink-types";

const initialState: ProposalState = {};

export function ProposalForm({
  opportunityId,
  relationships,
  existing,
}: {
  opportunityId: string;
  relationships: RelationshipRow[];
  existing: LinkerProposalRow | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProposalState, FormData>(
    submitProposalAction,
    initialState
  );
  const [isSubstitution, setIsSubstitution] = React.useState(
    existing?.is_target_substitution ?? false
  );

  useEffect(() => {
    if (state?.success && state.proposalId) {
      router.push("/dashboard/proposals");
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="opportunityId" value={opportunityId} />

      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Relationship basis */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Your relationship</h2>

          <div className="space-y-2">
            <Label htmlFor="relationshipId">
              Declared relationship <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              id="relationshipId"
              name="relationshipId"
              placeholder="Select a declared relationship"
              defaultValue={existing?.relationship_id ?? ""}
              options={relationships.map((r) => ({
                value: r.id,
                label: `${r.entity_name} · ${r.category.replace(/_/g, " ")}`,
              }))}
            />
            {relationships.length === 0 && (
              <p className="text-xs text-muted-foreground">
                You have no declared relationships yet. You can still describe one below.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationshipDeclared">Basis of your relationship *</Label>
            <Textarea
              id="relationshipDeclared"
              name="relationshipDeclared"
              rows={3}
              placeholder="e.g. I have worked directly with the Head of Procurement at this company for 3 years."
              defaultValue={existing?.relationship_declared ?? ""}
              required
            />
            {state?.fieldErrors?.relationshipDeclared && (
              <p className="text-xs text-destructive">{state.fieldErrors.relationshipDeclared[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proposal */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Your proposal</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proposedTarget">Proposed target (optional)</Label>
              <Input
                id="proposedTarget"
                name="proposedTarget"
                placeholder="e.g. Head of Procurement"
                defaultValue={existing?.proposed_target ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposedMethod">Proposed method</Label>
              <Input
                id="proposedMethod"
                name="proposedMethod"
                placeholder="e.g. Warm intro + meeting"
                defaultValue={existing?.proposed_method ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposedDeliverable">What you will deliver *</Label>
            <Textarea
              id="proposedDeliverable"
              name="proposedDeliverable"
              rows={3}
              placeholder="e.g. A warm introduction and a scheduled meeting with the decision-maker."
              defaultValue={existing?.proposed_deliverable ?? ""}
              required
            />
            {state?.fieldErrors?.proposedDeliverable && (
              <p className="text-xs text-destructive">{state.fieldErrors.proposedDeliverable[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proposedReward">Proposed reward (MYR) *</Label>
              <Input
                id="proposedReward"
                name="proposedReward"
                type="number"
                min={1}
                step="0.01"
                placeholder="e.g. 4500"
                defaultValue={existing?.proposed_reward ?? ""}
                required
              />
              {state?.fieldErrors?.proposedReward && (
                <p className="text-xs text-destructive">{state.fieldErrors.proposedReward[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposedDeadline">Proposed deadline (optional)</Label>
              <Input
                id="proposedDeadline"
                name="proposedDeadline"
                type="date"
                defaultValue={existing?.proposed_deadline?.slice(0, 10) ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={existing?.remarks ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Target substitution */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isTargetSubstitution"
              className="h-4 w-4 rounded border-border text-primary"
              checked={isSubstitution}
              onChange={(e) => setIsSubstitution(e.target.checked)}
            />
            This is a <strong>target substitution</strong> (different from the requested target).
          </label>

          {isSubstitution && (
            <div className="space-y-2">
              <Label htmlFor="substitutionReason">Reason for substitution *</Label>
              <Textarea
                id="substitutionReason"
                name="substitutionReason"
                rows={2}
                placeholder="Explain why the substituted target is equivalent."
                defaultValue={existing?.substitution_reason ?? ""}
              />
              {state?.fieldErrors?.substitutionReason && (
                <p className="text-xs text-destructive">{state.fieldErrors.substitutionReason[0]}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {existing ? "Update proposal" : "Submit proposal"}
        </Button>
      </div>
    </form>
  );
}