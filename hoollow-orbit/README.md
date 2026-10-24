# Hackathon HQ

Staff dashboard for running a hackathon. Super admins upload participants and teams; volunteers mark attendance.

## Roles

- **Super admin**: uploads the participant/team list (CSV or Excel), creates volunteer accounts, can undo check-ins, and can wipe participant data.
- **Volunteer**: searches participants by name, email, phone, college or team and checks them in.

Each participant can be checked in once. If two volunteers check in the same person at the same time, the first one counts and the second sees "already checked in".

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run `supabase/schema.sql`.
3. In **Authentication -> Sign In / Providers**, turn off **Allow new users to sign up**. Only super admins should create staff accounts.
4. Copy `.env.local.example` to `.env.local` and fill in the values from **Project Settings -> API**.
5. Create your own account in **Authentication -> Users -> Add user** (tick "Auto confirm"), then promote it in the SQL editor:

   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```

6. Run the app:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000 and sign in.

## Upload format

One row per participant. Header names are matched loosely (e.g. "Email ID", "Mobile Number" and "Team Name" all work).

| Column  | Required |
| ------- | -------- |
| Name    | yes      |
| Email   | yes      |
| Phone   | no       |
| College | no       |
| Team    | no       |

Teams are created from the Team column. Re-uploading updates existing participants (matched by email) without touching their attendance. A sample file is in `public/sample-participants.csv`.
