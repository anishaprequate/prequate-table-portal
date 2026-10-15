import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView, canWrite, isFullAdmin } from "@/lib/session";
import { disconnectGoogleCalendar } from "@/lib/actions/google-calendar";
import { updateRoomSettings } from "@/lib/actions/room";
import { syncFromNotion } from "@/lib/actions/notion";
import { saveBook, saveCrisisAccess, savePartnerCalendars } from "@/lib/actions/requests";
import { notionConfigured } from "@/lib/notion/client";
import { PageHero } from "@/components/page-hero";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; disconnected?: string; error?: string; roomSaved?: string; bookSaved?: string; crisisSaved?: string; hourSaved?: string; notion?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");
  const writable = canWrite(admin.role);

  const [connection, roomSettings, flagged, partners] = await Promise.all([
    prisma.googleCalendarConnection.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    prisma.user.findMany({
      where: { notionFlag: { not: null } },
      select: { id: true, name: true, seatNumber: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PARTNER" },
      select: { id: true, name: true, tableHoursCalendarId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const notionReady = notionConfigured();

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
      {searchParams.roomSaved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      {searchParams.bookSaved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Book saved.</p>
      )}

      {searchParams.hourSaved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Hours settings saved.</p>
      )}
      {searchParams.crisisSaved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Crisis access saved.</p>
      )}

      {searchParams.notion === "ok" && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Synced with Notion.</p>
      )}
      {searchParams.notion === "errors" && (
        <p className="mb-6 text-sm text-deep-orange">
          Synced, but some rows need attention. See the summary under Notion below.
        </p>
      )}
      {searchParams.notion === "failed" && (
        <p className="mb-6 text-sm text-deep-orange">
          Couldn&apos;t reach Notion. Check the token, and that both databases are shared with the integration.
        </p>
      )}
      {searchParams.notion === "not-configured" && (
        <p className="mb-6 text-sm text-deep-orange">NOTION_TOKEN is not set for the admin app.</p>
      )}

      <div className="mb-8">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">The Hour</div>
        <p className="mb-2 text-sm text-grey">
          Table hours calendars. Availability is a weekday pattern until Google Calendar sync is switched on. Each
          partner&apos;s calendar is saved here so that setup is only connecting the account.
        </p>
        <form action={savePartnerCalendars} className="flex flex-col gap-2">
          {partners.map((p) => (
            <label key={p.id} className="flex flex-col gap-1 text-sm">
              {p.name}
              <input
                type="text"
                name={`calendar_${p.id}`}
                defaultValue={p.tableHoursCalendarId ?? ""}
                placeholder="Calendar ID, for example abc123@group.calendar.google.com"
                disabled={!writable}
                className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
              />
            </label>
          ))}
          {writable && partners.length > 0 && (
            <button
              type="submit"
              className="mt-1 w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Save calendars
            </button>
          )}
        </form>
      </div>

      <div className="mb-8">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">Crisis access</div>
        <p className="mb-3 text-sm text-grey">
          A quiet line in each member&apos;s Settings: two sentences and who to reach. Leave both empty to use the
          standard wording.
        </p>
        <form action={saveCrisisAccess} className="flex flex-col gap-3">
          <textarea
            name="crisisAccessText"
            rows={3}
            maxLength={400}
            defaultValue={roomSettings?.crisisAccessText ?? ""}
            placeholder="If something is pressing and cannot wait for the usual route, call or message Anisha directly. You will reach a person, not a queue."
            disabled={!writable}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <input
            type="text"
            name="crisisAccessContact"
            defaultValue={roomSettings?.crisisAccessContact ?? ""}
            placeholder="Anisha, 9150582103"
            disabled={!writable}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          {writable && (
            <button
              type="submit"
              className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Save crisis access
            </button>
          )}
        </form>
      </div>

      <div className="mb-8">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">The book</div>
        <p className="mb-3 text-sm text-grey">
          The book of the year, shown on the member Home. Clear the title to take it down.
        </p>
        <form action={saveBook} className="flex flex-col gap-3">
          <input
            type="text"
            name="bookTitle"
            defaultValue={roomSettings?.bookTitle ?? ""}
            placeholder="Title"
            disabled={!writable}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <input
            type="text"
            name="bookAuthor"
            defaultValue={roomSettings?.bookAuthor ?? ""}
            placeholder="Author"
            disabled={!writable}
            className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs uppercase tracking-wide text-grey">Author dinner (once set)</span>
            <input
              type="datetime-local"
              name="bookDinnerAt"
              defaultValue={
                roomSettings?.bookDinnerAt
                  ? new Date(roomSettings.bookDinnerAt.getTime() - roomSettings.bookDinnerAt.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              disabled={!writable}
              className="w-fit rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>
          {writable && (
            <button
              type="submit"
              className="w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Save book
            </button>
          )}
        </form>
      </div>

      <div className="mb-8">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">Notion</div>
        <p className="mb-3 text-sm text-grey">
          Notion decides who is a member. The portal creates an account when a row becomes Active Member, and writes
          logins, Hours and events back to Portal Activity.
        </p>
        <p className="mb-3 text-sm">
          {roomSettings?.notionLastSyncAt
            ? `Last synced ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(roomSettings.notionLastSyncAt)}. ${roomSettings.notionLastSyncSummary ?? ""}`
            : "Not synced yet."}
        </p>
        {!notionReady && (
          <p className="mb-3 text-sm text-deep-orange">Add NOTION_TOKEN to the admin app&apos;s environment to turn this on.</p>
        )}
        {writable && notionReady && (
          <form action={syncFromNotion}>
            <button
              type="submit"
              className="rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Sync now
            </button>
          </form>
        )}
        {flagged.length > 0 && (
          <div className="mt-4 rounded-md border border-grey/15 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-grey">Flagged in Notion as Declined</p>
            <ul className="flex flex-col gap-1 text-sm">
              {flagged.map((m) => (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className="underline hover:no-underline">
                    {m.name}
                  </Link>
                  {m.seatNumber ? <span className="text-grey"> · seat {m.seatNumber}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-grey">Accounts stay active until you decide. Nothing is deactivated automatically.</p>
          </div>
        )}
      </div>

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
          className="inline-flex min-h-[44px] items-center text-sm text-ink underline decoration-grey/40 underline-offset-4 transition hover:decoration-ink"
        >
          Canned responses
        </Link>
      </div>

      <div className="mt-12">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">Profile</div>
        <Link
          href="/settings/interests"
          className="inline-flex min-h-[44px] items-center text-sm text-ink underline decoration-grey/40 underline-offset-4 transition hover:decoration-ink"
        >
          Interest categories
        </Link>
      </div>

      <div className="mt-12">
        <div className="mb-2 text-xs uppercase tracking-wide text-grey">The Room</div>
        <p className="mb-4 text-sm text-grey">
          An optional line below the Room stating total Hours held this month, with no names attached.
        </p>
        {isFullAdmin(admin.role) && writable ? (
          <form action={updateRoomSettings}>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="roomPulseEnabled"
                defaultChecked={roomSettings?.roomPulseEnabled ?? true}
                className="h-4 w-4 accent-orange"
              />
              Show the room pulse line
            </label>
            <button
              type="submit"
              className="mt-4 w-fit rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Save
            </button>
          </form>
        ) : (
          <p className="text-sm">{roomSettings?.roomPulseEnabled ?? true ? "Currently shown." : "Currently hidden."}</p>
        )}
      </div>
    </div>
  );
}
