export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  checked_in_at: string | null;
  team: { name: string } | null;
  checked_in_by_profile: { full_name: string | null } | null;
};

export const PARTICIPANT_SELECT =
  "id, name, email, phone, college, checked_in_at, team:teams(name), checked_in_by_profile:profiles(full_name)";

// Fixed zone so server-rendered and client-rendered times match.
const TIME_ZONE = "Asia/Kolkata";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
