import { prisma } from "@prequate/db";

// The member's relationship manager is the owner, Anisha. Messages in that
// thread carry her name, not "the team".
export async function getRmFirstName(): Promise<string> {
  const owner = await prisma.user.findFirst({ where: { role: "ADMIN_OWNER" }, orderBy: { createdAt: "asc" }, select: { name: true } });
  return (owner?.name ?? "Anisha").split(" ")[0];
}
