import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";

export default async function RootPage() {
  const admin = await getCurrentAdmin();
  redirect(admin ? "/bookings" : "/login");
}
