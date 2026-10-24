import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "super_admin" | "volunteer";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

// Deduped per request: the sidebar, mobile nav and page all ask for the profile.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "super_admin") redirect("/dashboard");
  return profile;
}
