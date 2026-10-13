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
      <div className="animate-fade-up">
        <p className="mb-4 text-sm uppercase tracking-[0.28em] text-taupe">
          Seat {formatSeatDisplay(user.seatNumber)}
        </p>
        <h1 className="mb-10 font-display text-4xl text-ink">{user.name}</h1>

        <form action={completeArrival}>
          <button type="submit" className="btn-primary !bg-foil px-8 !text-ink hover:!text-bone">
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
