import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPlays } from "@/lib/aggregate/shared";
import { getDiscoveryWeeks } from "@/lib/aggregate/discovery";
import { DiscoveryChart } from "@/components/DiscoveryChart";

export default async function DiscoveryPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const plays = await getPlays(supabaseAdmin(), session.spotifyAccountId);

  return (
    <div className="w-[90%] mx-auto space-y-6">
      <h1 className="text-xl font-semibold">New vs. familiar</h1>
      <p className="text-sm text-zinc-500">
        How much of your listening goes to artists you&apos;d never played before. High weeks are exploring;
        low weeks are comfort listening.
      </p>
      <DiscoveryChart weeks={getDiscoveryWeeks(plays, timeZone)} />
    </div>
  );
}
