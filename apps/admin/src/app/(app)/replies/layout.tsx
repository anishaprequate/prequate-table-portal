import { requireSection } from "@/lib/guard";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSection("replies");
  return <>{children}</>;
}
