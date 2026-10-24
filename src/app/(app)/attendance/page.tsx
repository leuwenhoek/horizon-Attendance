import { requireProfile } from "@/lib/auth";
import { fetchAllParticipants } from "@/lib/participants";
import { createClient } from "@/lib/supabase/server";
import { AttendanceList } from "./attendance-list";

export default async function AttendancePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const participants = await fetchAllParticipants(supabase);

  return <AttendanceList participants={participants} canUndo={profile.role === "super_admin"} />;
}
