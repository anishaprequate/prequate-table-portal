import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { homeFor } from "@/lib/access";

export default async function RootPage() {
  const admin = await getCurrentAdmin();
  redirect(admin ? homeFor(admin.role) : "/login");
}
