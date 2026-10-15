import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";

// The shared Associate login does not see Settings. Partners keep reaching
// canned responses; the Settings page itself already turns them away.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (admin.role === "ADMIN_ASSOCIATE") redirect("/members");
  return <>{children}</>;
}
