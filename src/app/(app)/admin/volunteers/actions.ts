"use server";

import { revalidatePath } from "next/cache";
import { getProfile, type Role } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type CreateStaffState = { ok?: boolean; error?: string; message?: string };

export async function createStaff(_prev: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  const me = await getProfile();
  if (me?.role !== "super_admin") return { error: "Only super admins can add staff." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role: Role = formData.get("role") === "super_admin" ? "super_admin" : "volunteer";

  if (!fullName || !email) return { error: "Name and email are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "Could not create user." };

  if (role === "super_admin") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) return { error: `User created but role update failed: ${roleError.message}` };
  }

  revalidatePath("/admin/volunteers");
  return { ok: true, message: `${fullName} can now sign in with ${email}.` };
}

export async function removeStaff(userId: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getProfile();
  if (me?.role !== "super_admin") return { ok: false, error: "Only super admins can remove staff." };
  if (me.id === userId) return { ok: false, error: "You can't remove your own account." };

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/volunteers");
  return { ok: true };
}
