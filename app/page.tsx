import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export default async function Home() {
  if (process.env.PUBLIC_DEMO_ENABLED === "true") {
    redirect("/demo");
  }

  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  redirect(session ? "/dashboard" : "/login");
}
