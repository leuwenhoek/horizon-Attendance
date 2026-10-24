"use client";

import { useActionState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { createStaff, removeStaff, type CreateStaffState } from "./actions";

export function CreateStaffForm() {
  const [state, formAction, pending] = useActionState<CreateStaffState, FormData>(createStaff, {});

  return (
    <form key={state.message} action={formAction} className="card">
      <div className="card-header">
        <h2 className="card-title">Add member</h2>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label htmlFor="full_name" className="field-label">
            Full name
          </label>
          <input id="full_name" name="full_name" required className="input" />
        </div>
        <div>
          <label htmlFor="staff_email" className="field-label">
            Email
          </label>
          <input id="staff_email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label htmlFor="staff_password" className="field-label">
            Temporary password
          </label>
          <input
            id="staff_password"
            name="password"
            type="text"
            required
            minLength={6}
            autoComplete="off"
            className="input font-mono"
          />
          <p className="mt-1.5 text-xs text-muted">At least 6 characters. Share it with them directly.</p>
        </div>

        <fieldset>
          <legend className="field-label">Role</legend>
          <div className="grid grid-cols-2 rounded-md border border-line bg-bg p-0.5">
            {[
              { value: "volunteer", label: "Volunteer" },
              { value: "super_admin", label: "Admin" },
            ].map((r) => (
              <label key={r.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  defaultChecked={r.value === "volunteer"}
                  className="peer sr-only"
                />
                <span className="flex h-7 items-center justify-center rounded text-[13px] font-medium text-muted transition-colors peer-checked:bg-surface-2 peer-checked:text-zinc-100 peer-checked:shadow-[0_0_0_1px_var(--line-strong)] peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50">
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
        {state.message && <p className="text-[13px] text-emerald-300">{state.message}</p>}
      </div>

      <div className="flex justify-end border-t border-line px-4 py-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create account
        </button>
      </div>
    </form>
  );
}

export function RemoveStaffButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={`Remove ${name}`}
      aria-label={`Remove ${name}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name}? They will no longer be able to sign in.`)) return;
        startTransition(async () => {
          const res = await removeStaff(userId);
          if (!res.ok) alert(res.error);
        });
      }}
      className="btn-ghost btn-icon hover:text-red-400"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
