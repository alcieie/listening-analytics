import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPlays } from "@/lib/aggregate/shared";
import { getObsessions } from "@/lib/aggregate/onRepeat";
import { ObsessionList } from "@/components/ObsessionList";

export default async function OnRepeatPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const plays = await getPlays(supabaseAdmin(), session.spotifyAccountId);

  return (
    <div className="w-[90%] mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">On repeat</h1>
      <ObsessionList obsessions={getObsessions(plays, new Date(), timeZone)} />
    </div>
  );
}
