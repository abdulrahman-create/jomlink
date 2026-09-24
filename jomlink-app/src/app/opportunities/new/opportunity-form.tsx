"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Save, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { OPPORTUNITY_CATEGORIES } from "@/lib/constants";
import {
  createOpportunityAction,
  type OpportunityState,
} from "@/app/actions/opportunities";
import { computeFunding } from "@/lib/funding";
import type { BusinessProfileRow } from "@/lib/jomlink-types";

const RESTRICTED = "GOVERNMENT_PUBLIC_SECTOR";

function money(n: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);
}

const initialState: OpportunityState = {};

export function OpportunityForm({
  businessProfiles,
  defaultCountry,
}: {
  businessProfiles: BusinessProfileRow[];
  defaultCountry: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityState, FormData>(
    createOpportunityAction,
    initialState
  );

  const [category, setCategory] = React.useState<string>(
    OPPORTUNITY_CATEGORIES[0].value
  );
  const [reward, setReward] = React.useState("");
  const isRestricted = category === RESTRICTED;

  const funding = computeFunding(Number(reward) || 0);

  useEffect(() => {
    if (state?.success && state.opportunityId) {
      router.push(`/opportunities/${state.opportunityId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
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
              <Input id="targetRole" name="targetRole" placeholder="e.g. Chief Procurement Officer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionMethod">Preferred connection method</Label>
              <Input id="connectionMethod" name="connectionMethod" placeholder="e.g. Warm intro, event meeting" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="targetRoleExact" className="h-4 w-4 rounded border-border text-primary" />
            Exact role is required (cannot substitute).
          </label>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              name="purpose"
              rows={2}
              placeholder="Why do you need this introduction?"
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
            <Textarea id="businessDescription" name="businessDescription" rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acceptableAlternatives">Acceptable alternatives (optional)</Label>
              <Input
                id="acceptableAlternatives"
                name="acceptableAlternatives"
                placeholder="e.g. Any C-suite with procurement authority"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geographicPreference">Geographic preference</Label>
              <Input
                id="geographicPreference"
                name="geographicPreference"
                placeholder="e.g. MY, SG"
                defaultValue={defaultCountry || ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input id="deadline" name="deadline" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidentiality">Confidentiality</Label>
              <Select
                id="confidentiality"
                name="confidentiality"
                defaultValue={isRestricted ? "RESTRICTED" : "PUBLIC"}
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
              min={1}
              step="0.01"
              placeholder="e.g. 5000"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              required
            />
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
                  <span>Reward (held in escrow)</span>
                  <span className="tabular-nums text-foreground">{money(funding.reward)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Activation fee (10%)</span>
                  <span className="tabular-nums text-foreground">{money(funding.activationFee)}</span>
                </li>
                <li className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>Total to fund</span>
                  <span className="tabular-nums text-foreground">{money(funding.escrowAmount)}</span>
                </li>
              </ul>
              <p className="mt-2 text-xs">
                Payments are simulated in this phase — no real money is charged.
              </p>
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
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Posting creates a <strong>Draft</strong>. You can publish it afterwards.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Create draft
        </Button>
      </div>
    </form>
  );
}