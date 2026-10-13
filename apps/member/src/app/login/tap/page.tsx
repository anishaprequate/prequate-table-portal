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
      <div className="w-full max-w-sm animate-fade-up text-center">
        <div className="card mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full px-6 text-center shadow-md">
          <span className="font-display text-lg italic leading-snug text-ink">
            Hold your plate near your phone
          </span>
        </div>

        <form action={simulateTap} className="flex flex-col gap-3">
          <label className="text-left text-xs text-taupe">
            NFC hardware isn&apos;t connected yet. Choose a plate to simulate the tap.
            <select name="chipUid" defaultValue="" required className="input-field mt-1">
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

          <button type="submit" className="btn-primary mt-2 w-full !bg-foil !text-ink hover:!text-bone">
            Simulate tap
          </button>
        </form>

        <a href="/login" className="btn-secondary mt-6 block w-full">
          Back
        </a>
      </div>
    </main>
  );
}
