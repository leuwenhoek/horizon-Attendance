"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckInResult =
  | { ok: true; status: "checked_in" | "already_checked_in"; checkedInAt: string; checkedInBy: string | null }
  | { ok: false; error: string };

export async function checkIn(participantId: string): Promise<CheckInResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("check_in_participant", { p_participant_id: participantId })
    .single<{ status: "checked_in" | "already_checked_in"; checked_in_at: string; checked_in_by_name: string | null }>();

  if (error || !data) return { ok: false, error: error?.message ?? "Check-in failed" };

  revalidatePath("/dashboard");
  revalidatePath("/teams");
  return {
    ok: true,
    status: data.status,
    checkedInAt: data.checked_in_at,
    checkedInBy: data.checked_in_by_name,
  };
}

export async function undoCheckIn(participantId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_check_in", { p_participant_id: participantId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/teams");
  return { ok: true };
}
