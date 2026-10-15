import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { canSeeSection, homeFor, type Section } from "@/lib/access";

// Put this in a section's layout: a login that may not see the section is sent
// to its own home, whatever address it typed.
export async function requireSection(section: Section) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!canSeeSection(admin.role, section)) redirect(homeFor(admin.role));
  return admin;
}
