import { prisma } from "@prequate/db";
import { setTeamPassword } from "@/lib/actions/auth";
import { SetPasswordForm } from "@/components/password-form";
import { ROLE_LABELS } from "@/lib/access";
import { PageHero } from "@/components/page-hero";

// The owner's page: who can sign in, and a way to set or reset each password.
export default async function TeamPage() {
  const people = await prisma.user.findMany({
    where: { username: { not: null }, role: { in: ["ADMIN_OWNER", "ADMIN_RM", "PARTNER", "ADMIN_ASSOCIATE"] } },
    orderBy: { username: "asc" },
    select: { id: true, name: true, username: true, role: true, passwordHash: true },
  });

  return (
    <div className="max-w-2xl">
      <PageHero title="Team" accent="logins." subtitle="Each person signs in with their own username and password." />
      <p className="mb-8 text-sm text-grey">
        Set a password here and tell that person. They can change it themselves after signing in, except the shared
        Associate login, which only you change.
      </p>
      <ul className="flex flex-col gap-4">
        {people.map((p) => (
          <li key={p.id} className="rounded-lg border border-grey/20 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base text-ink">
                  {p.username} <span className="text-sm text-grey">· {p.name}</span>
                </p>
                <p className="text-xs text-grey">{ROLE_LABELS[p.role] ?? p.role}</p>
              </div>
              <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs ${p.passwordHash ? "bg-grey/10 text-ink" : "bg-orange/15 text-ink"}`}>
                {p.passwordHash ? "Password set" : "No password yet"}
              </span>
            </div>
            <SetPasswordForm userId={p.id} username={p.username!} action={setTeamPassword} />
          </li>
        ))}
      </ul>
    </div>
  );
}
