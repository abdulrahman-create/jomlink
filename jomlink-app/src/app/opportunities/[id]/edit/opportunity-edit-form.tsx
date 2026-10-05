"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { OPPORTUNITY_CATEGORIES, FEES, formatMYR } from "@/lib/constants";
import {
  updateOpportunityAction,
  type OpportunityState,
} from "@/app/actions/opportunities";
import { computeFunding } from "@/lib/funding";
import type { OpportunityRow } from "@/lib/jomlink-types";

const RESTRICTED = "GOVERNMENT_PUBLIC_SECTOR";

function money(n: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Convert a stored date/timestamp to the `yyyy-mm-dd` a date input expects. */
function toDateInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const initialState: OpportunityState = {};

export function OpportunityEditForm({ opportunity }: { opportunity: OpportunityRow }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityState, FormData>(
    updateOpportunityAction,
    initialState
  );

  const [category, setCategory] = React.useState<string>(opportunity.category);
  const [reward, setReward] = React.useState<string>(
    String(Number(opportunity.offer_amount ?? 0))
  );
  const isRestricted = category === RESTRICTED;

  const funding = computeFunding(Number(reward) || 0);

  useEffect(() => {
    if (state?.success && state.opportunityId) {
      router.push(`/opportunities/${state.opportunityId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={opportunity.id} />

      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {isRestricted && (
        <div className="flex items-start gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Government / Public Sector opportunities are a <strong>restricted category</strong>. They
            are stored with Restricted confidentiality and reviewed for compliance.
          </span>
        </div>
      )}

      {/* Step 1 · What */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">1 · What you need</h2>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Access to procurement director at Telco X"
              defaultValue={opportunity.title}
              required
            />
            {state?.fieldErrors?.title && (
              <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                name="category"
                options={OPPORTUNITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetEntity">Target entity / organisation</Label>
              <Input
                id="targetEntity"
                name="targetEntity"
                placeholder="e.g. Celcom Digi, MBSB Bank, Ministry of Finance"
                defaultValue={opportunity.target_entity}
                required
              />
              {state?.fieldErrors?.targetEntity && (
                <p className="text-xs text-destructive">{state.fieldErrors.targetEntity[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target role (optional)</Label>
              <Input
                id="targetRole"
                name="targetRole"
                placeholder="e.g. Chief Procurement Officer"
                defaultValue={opportunity.target_role ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionMethod">Preferred connection method</Label>
              <Input
                id="connectionMethod"
                name="connectionMethod"
                placeholder="e.g. Warm intro, event meeting"
                defaultValue={opportunity.connection_method ?? ""}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="targetRoleExact"
              defaultChecked={opportunity.target_role_exact}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Exact role is required (cannot substitute).
          </label>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              name="purpose"
              rows={2}
              placeholder="Why do you need this introduction?"
              defaultValue={opportunity.purpose}
              required
            />
            {state?.fieldErrors?.purpose && (
              <p className="text-xs text-destructive">{state.fieldErrors.purpose[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 · Details & deliverable */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">2 · Details &amp; deliverable</h2>

          <div className="space-y-2">
            <Label htmlFor="requiredOutcome">Required outcome / deliverable</Label>
            <Textarea
              id="requiredOutcome"
              name="requiredOutcome"
              rows={3}
              placeholder="What should the Linker actually deliver (introduction, meeting, access)?"
              defaultValue={opportunity.required_outcome}
              required
            />
            {state?.fieldErrors?.requiredOutcome && (
              <p className="text-xs text-destructive">{state.fieldErrors.requiredOutcome[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessDescription">
              About your business <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="businessDescription"
              name="businessDescription"
              rows={3}
              defaultValue={opportunity.business_description ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acceptableAlternatives">Acceptable alternatives (optional)</Label>
              <Input
                id="acceptableAlternatives"
                name="acceptableAlternatives"
                placeholder="e.g. Any C-suite with procurement authority"
                defaultValue={opportunity.acceptable_alternatives ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geographicPreference">Geographic preference</Label>
              <Input
                id="geographicPreference"
                name="geographicPreference"
                placeholder="e.g. MY, SG"
                defaultValue={opportunity.geographic_preference ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={toDateInput(opportunity.deadline)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidentiality">Confidentiality</Label>
              <Select
                id="confidentiality"
                name="confidentiality"
                defaultValue={isRestricted ? "RESTRICTED" : opportunity.confidentiality}
                disabled={isRestricted}
                options={[
                  { value: "PUBLIC", label: "Public" },
                  { value: "MATCHED", label: "Matched only" },
                  { value: "RESTRICTED", label: "Restricted" },
                  { value: "PRIVATE_DIRECT", label: "Private / direct" },
                ]}
              />
              {isRestricted && (
                <p className="text-xs text-muted-foreground">
                  Restricted public-sector listings are shown only to eligible Linkers.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 · Reward & funding */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">3 · Reward &amp; funding</h2>

          <div className="space-y-2">
            <Label htmlFor="offerAmount">Reward (MYR)</Label>
            <Input
              id="offerAmount"
              name="offerAmount"
              type="number"
              min={FEES.MIN_OPPORTUNITY_REWARD}
              step="0.01"
              placeholder="e.g. 5000"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum {formatMYR(FEES.MIN_OPPORTUNITY_REWARD)} — the 10% posting
              deposit must cover the {formatMYR(FEES.LISTING_FEE)} listing fee.
              {opportunity.status !== "DRAFT" && (
                <>
                  {" "}
                  Changing the reward changes the 10% posting deposit; the difference is
                  reconciled at posting.
                </>
              )}
            </p>
            {state?.fieldErrors?.offerAmount && (
              <p className="text-xs text-destructive">{state.fieldErrors.offerAmount[0]}</p>
            )}
          </div>

          {Number(reward) > 0 && (
            <div className="rounded-md border border-border bg-muted p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Funding preview
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex justify-between">
                  <span>Posting deposit (10%, refundable less listing fee)</span>
                  <span className="tabular-nums text-foreground">{money(funding.postingDeposit)}</span>
                </li>
                <li className="flex justify-between pl-4 text-xs">
                  <span className="italic">— incl. {money(funding.listingFee)} non-refundable listing fee</span>
                  <span className="tabular-nums">{money(funding.listingFee)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Reward (settled when you accept a Linker)</span>
                  <span className="tabular-nums text-foreground">{money(funding.reward)}</span>
                </li>
                <li className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>Total cost to you</span>
                  <span className="tabular-nums text-foreground">
                    {money(funding.reward + funding.postingDeposit)}
                  </span>
                </li>
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additionalRequirements">
              Additional requirements <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="additionalRequirements"
              name="additionalRequirements"
              rows={2}
              defaultValue={opportunity.additional_requirements ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Changes are applied to your listing immediately.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
