"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  updateMemberDetailsAction,
  removeAvatarAction,
  type BasicDetailsState,
} from "@/app/actions/profile";

const initialState: BasicDetailsState = {};

/**
 * Edits the member's basic account details — full name, mobile, country,
 * location (these live on the `jomlink.users` row) plus a compact profile
 * photo uploader. Professional fields (headline, work history) are edited
 * in ProfileForm.
 */
export function BasicDetailsForm({
  photoUrl,
  fullName,
  mobile,
  country,
  location,
}: {
  photoUrl: string | null;
  fullName: string;
  mobile: string | null;
  country: string | null;
  location: string | null;
}) {
  const [state, action, pending] = useActionState<BasicDetailsState, FormData>(
    updateMemberDetailsAction,
    initialState
  );

  const initial = (fullName || "U").charAt(0).toUpperCase();

  return (
    <form action={action} className="space-y-5">
      {state?.success && (
        <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
          Details saved.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Photo + full name row */}
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground">
            Full name
          </Label>
          <Input id="fullName" name="fullName" defaultValue={fullName ?? ""} placeholder="e.g. Abdul Rahman" />
        </div>
      </div>

      {/* Compact photo uploader */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="h-9 w-auto max-w-[220px] text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary-soft file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
        />
        <span className="text-xs text-muted-foreground">JPEG · PNG · WebP, max 5 MB</span>
        {photoUrl && (
          <button
            type="button"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).form;
              if (form) void removeAvatarAction(new FormData(form));
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-md text-xs font-medium text-destructive hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input id="mobile" name="mobile" defaultValue={mobile ?? ""} placeholder="e.g. +6012 345 6789" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select id="country" name="country" defaultValue={country ?? "MY"}>
            <option value="MY">Malaysia</option>
            <option value="TH">Thailand</option>
            <option value="VN">Vietnam</option>
            <option value="ID">Indonesia</option>
            <option value="IN">India</option>
            <option value="SG">Singapore</option>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={location ?? ""} placeholder="e.g. Kuala Lumpur" />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" aria-hidden="true" /> Save details</>
        )}
      </Button>
    </form>
  );
}