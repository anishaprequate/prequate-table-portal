import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { completeArrival } from "@/lib/actions/auth";
import { formatSeatDisplay } from "@/lib/format";

export default async function ArrivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.firstLoginAt) redirect("/home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 text-sm text-grey">Seat {formatSeatDisplay(user.seatNumber)}</p>
      <h1 className="mb-10 font-display text-4xl text-ink">{user.name}</h1>

      <form action={completeArrival}>
        <button
          type="submit"
          className="rounded-md bg-orange px-8 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
