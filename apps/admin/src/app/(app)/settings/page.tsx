import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite } from "@/lib/session";
import { disconnectGoogleCalendar } from "@/lib/actions/google-calendar";
import { PageHero } from "@/components/page-hero";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; disconnected?: string; error?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const connection = await prisma.googleCalendarConnection.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-md">
      <PageHero title="Settings" />

      {searchParams.connected && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Connected. New Hour bookings will now create a real event on this calendar.
        </p>
      )}
      {searchParams.disconnected && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
          Disconnected. Bookings will go back to the mock calendar until reconnected.
        </p>
      )}
      {searchParams.error && (
        <p className="mb-6 text-sm text-deep-orange">
          Couldn&apos;t connect. Check the server logs for what Google returned, and try again.
        </p>
      )}

      <div className="mb-2 text-xs uppercase tracking-wide text-grey">Google Calendar</div>

      {connection ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Connected as <span className="font-medium">{connection.accountEmail}</span>. Every
            Hour booking creates a real event on this calendar.
          </p>
          {writable && (
            <form action={disconnectGoogleCalendar}>
              <button
                type="submit"
                className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
              >
                Disconnect
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-grey">
            Not connected. Bookings create a mock calendar reference only — no real event.
          </p>
          {writable && (
            <a
              href="/api/google/connect"
              className="w-fit rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      )}

      <div className="mt-12">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">Messages</div>
        <Link
          href="/settings/canned-responses"
          className="text-sm text-ink underline decoration-grey/40 underline-offset-4 transition hover:decoration-ink"
        >
          Canned responses
        </Link>
      </div>
    </div>
  );
}
