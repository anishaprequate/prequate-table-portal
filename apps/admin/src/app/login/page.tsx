import { prisma } from "@prequate/db";
import { adminLogin } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/password-input";
import { PageHero } from "@/components/page-hero";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN_OWNER", "ADMIN_RM", "PARTNER", "ADMIN_ASSOCIATE"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <PageHero
          title="Admin"
          accent="console"
          subtitle="Bookings, events, concierge, and content."
        />

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-deep-orange">
            That passphrase didn&apos;t match. Try again.
          </p>
        )}

        <form action={adminLogin} className="flex flex-col gap-3">
          <select
            name="userId"
            required
            defaultValue=""
            className="w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-sm text-ink"
          >
            <option value="" disabled>
              Select your name
            </option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
                {admin.role === "PARTNER" ? " (Partner)" : ""}
                {admin.role === "ADMIN_ASSOCIATE" ? " (Associate — read only)" : ""}
              </option>
            ))}
          </select>
          <PasswordInput name="passphrase" placeholder="Passphrase" required />
          <button
            type="submit"
            className="w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
