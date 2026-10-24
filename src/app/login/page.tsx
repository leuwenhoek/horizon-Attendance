"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[340px] animate-fade-in">
        <Logo compact />
        <h1 className="mt-6 text-lg font-semibold tracking-tight text-zinc-50">Sign in to Hackathon HQ</h1>
        <p className="mt-1 text-[13px] text-muted">Use the staff account your organiser created for you.</p>

        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" autoFocus className="input" />
          </div>
          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-[13px] text-red-400">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary btn-lg w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
