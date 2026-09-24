"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import type { MemberProfileRow } from "@/lib/jomlink-types";

const initialState: ProfileState = {};

export function ProfileForm({ profile }: { profile: MemberProfileRow | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    initialState
  );

  const languages = profile?.languages ?? [];

  return (
    <form action={action} className="space-y-5">
      {state?.success && (
        <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
          Profile saved.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="headline">Professional headline</Label>
          <Input id="headline" name="headline" defaultValue={profile?.headline ?? ""} placeholder="e.g. Business Development Director" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" defaultValue={profile?.industry ?? ""} placeholder="e.g. Technology" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentPosition">Current position</Label>
          <Input id="currentPosition" name="currentPosition" defaultValue={profile?.current_position ?? ""} placeholder="e.g. Managing Director" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentOrganisation">Current organisation</Label>
          <Input id="currentOrganisation" name="currentOrganisation" defaultValue={profile?.current_organisation ?? ""} placeholder="e.g. ABC Holdings Sdn Bhd" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={profile?.city ?? ""} placeholder="e.g. Kuala Lumpur" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Region / State</Label>
          <Input id="region" name="region" defaultValue={profile?.region ?? ""} placeholder="e.g. KL / Selangor" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select id="country" name="country" defaultValue={profile?.country ?? "MY"}>
            <option value="MY">Malaysia</option>
            <option value="TH">Thailand</option>
            <option value="VN">Vietnam</option>
            <option value="ID">Indonesia</option>
            <option value="IN">India</option>
            <option value="SG">Singapore</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of experience</Label>
          <Input id="yearsOfExperience" name="yearsOfExperience" type="number" min={0} max={80} defaultValue={profile?.years_of_experience?.toString() ?? ""} placeholder="e.g. 10" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="languages">Languages</Label>
        <div className="flex flex-wrap gap-2">
          {["English", "Malay", "Mandarin", "Tamil", "Cantonese", "Bahasa Indonesia", "Other"].map((lang) => (
            <label key={lang} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
              <input
                type="checkbox"
                name="languages"
                value={lang}
                defaultChecked={languages.includes(lang)}
                className="sr-only"
              />
              {lang}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Professional biography</Label>
        <Textarea id="bio" name="bio" rows={4} defaultValue={profile?.bio ?? ""} placeholder="Briefly describe your professional background..." className="resize-y" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" aria-hidden="true" /> Save profile</>
        )}
      </Button>
    </form>
  );
}