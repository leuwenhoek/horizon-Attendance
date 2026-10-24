import type { SupabaseClient } from "@supabase/supabase-js";
import { PARTICIPANT_SELECT, type ParticipantRow } from "@/lib/types";

// Supabase caps each select at 1000 rows, so page through to get everyone.
export async function fetchAllParticipants(supabase: SupabaseClient): Promise<ParticipantRow[]> {
  const pageSize = 1000;
  const rows: ParticipantRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("participants")
      .select(PARTICIPANT_SELECT)
      .order("name")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as ParticipantRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
