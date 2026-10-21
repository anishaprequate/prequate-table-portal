import { requireSection } from "@/lib/guard";

// Advisor requests are for the advisor desk only.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSection("advisors");
  return <>{children}</>;
}
