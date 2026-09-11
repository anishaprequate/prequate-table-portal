import { prisma } from "@prequate/db";
import { simulateTap } from "@/lib/actions/auth";
import { formatSeatDisplay } from "@/lib/format";

export default async function TapLoginPage() {
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { name: "asc" },
    select: { chipUid: true, name: true, seatNumber: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border border-grey/30 px-6 text-center">
          <span className="font-display text-lg italic leading-snug text-ink">
            Hold your plate near your phone
          </span>
        </div>

        <form action={simulateTap} className="flex flex-col gap-3">
          <label className="text-left text-xs text-grey">
            NFC hardware isn&apos;t connected yet. Choose a plate to simulate the tap.
            <select
              name="chipUid"
              defaultValue=""
              required
              className="mt-1 w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="" disabled>
                Select a plate
              </option>
              {members.map((member) => (
                <option key={member.chipUid} value={member.chipUid ?? ""}>
                  Seat {formatSeatDisplay(member.seatNumber)} — {member.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
          >
            Simulate tap
          </button>
        </form>

        <a
          href="/login"
          className="mt-6 block w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Back
        </a>
      </div>
    </main>
  );
}
