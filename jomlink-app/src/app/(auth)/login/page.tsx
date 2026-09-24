"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginMember, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    loginMember,
    initialState
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-6">
        <Logo href="/" />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in to manage your opportunities and connections.
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state?.error && (
              <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required aria-required="true" autoComplete="email" />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" placeholder="Your password" required aria-required="true" autoComplete="current-password" />
              {state?.fieldErrors?.password && (
                <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Logging in...
                </>
              ) : (
                <>
                  Log in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Jomlink?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}