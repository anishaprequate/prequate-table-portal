import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SeatBadge } from "@/components/seat-badge";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [firstName, ...rest] = user.name.split(" ");
  const lastName = rest.join(" ");

  return (
    <div className="max-w-md">
      {searchParams.saved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <SeatBadge seatNumber={user.seatNumber} />
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange/10 font-display text-xl text-ink">
              {user.name.charAt(0)}
            </div>
          )}
          <h1 className="font-display text-[2.75rem] italic leading-[1.02] tracking-[-0.01em] text-ink">
            {firstName} <span className="text-deep-orange">{lastName}</span>
          </h1>
        </div>

        {user.linkedinUrl && (
          <a
            href={user.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Your LinkedIn"
            className="mt-3 flex-shrink-0 text-grey transition hover:text-ink"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.36 4.25 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
        )}
      </div>

      <dl className="mb-10 flex flex-col gap-5">
        <div>
          <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Seat type</dt>
          <dd className="text-sm">{user.seatType ?? "—"}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Email</dt>
          <dd className="text-sm">{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs uppercase tracking-wide text-grey">Bio</dt>
          <dd className="whitespace-pre-wrap text-sm">{user.longBio ?? user.bio ?? "—"}</dd>
        </div>
      </dl>

      <Link
        href="/profile/edit"
        className="inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
      >
        Edit
      </Link>
    </div>
  );
}
