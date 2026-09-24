"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { registerMember, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    registerMember,
    initialState
  );
  const router = useRouter();

  React.useEffect(() => {
    if (state?.success) router.push("/dashboard");
  }, [state, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-6">
        <Logo href="/" />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Join Jomlink to discover business opportunities and provide valuable introductions.
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state?.error && (
              <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" placeholder="e.g. Aina Rahman" required aria-required="true" />
              {state?.fieldErrors?.fullName && (
                <p className="text-xs text-destructive">{state.fieldErrors.fullName[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required aria-required="true" />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" name="mobile" type="tel" placeholder="+60123456789" required aria-required="true" />
              {state?.fieldErrors?.mobile && (
                <p className="text-xs text-destructive">{state.fieldErrors.mobile[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="At least 8 characters" required aria-required="true" />
              {state?.fieldErrors?.password && (
                <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select id="country" name="country" defaultValue="MY" required placeholder="Select country">
                <option value="MY">Malaysia</option>
                <option value="TH">Thailand</option>
                <option value="VN">Vietnam</option>
                <option value="ID">Indonesia</option>
                <option value="IN">India</option>
                <option value="SG">Singapore</option>
              </Select>
              {state?.fieldErrors?.country && (
                <p className="text-xs text-destructive">{state.fieldErrors.country[0]}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creating account...
                </>
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="/trust-safety" className="underline">Trust &amp; Safety</Link> and{" "}
          <Link href="/prohibited" className="underline">Prohibited Activities</Link> policies.
        </p>
      </main>
    </div>
  );
}