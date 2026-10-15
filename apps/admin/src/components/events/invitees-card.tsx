import Link from "next/link";
import { invitationStatus } from "@/lib/invitation-status";

interface Invitee {
  id: string;
  invited: boolean;
  joined: boolean;
  waitlisted: boolean;
  pendingApproval: boolean;
  declinedAt: Date | null;
  invitationSentAt: Date | null;
  member: { name: string };
}

const ORDER = { good: 0, wait: 1, muted: 2 } as const;
const TONE = {
  good: "bg-orange/15 text-ink",
  wait: "bg-grey/10 text-ink",
  muted: "bg-grey/10 text-grey",
} as const;

// Who has been invited, and where each invitation stands. Shown on the event
// overview and the registration page, so it is never more than a glance away.
export function InviteesCard({
  eventId,
  attendances,
  writable,
}: {
  eventId: string;
  attendances: Invitee[];
  writable: boolean;
}) {
  const invitees = attendances
    .filter((a) => a.invited)
    .map((a) => ({ a, status: invitationStatus(a) }))
    .sort((x, y) => ORDER[x.status.tone] - ORDER[y.status.tone] || x.a.member.name.localeCompare(y.a.member.name));

  const accepted = invitees.filter((i) => i.a.joined || i.a.waitlisted || i.a.pendingApproval).length;
  const declined = invitees.filter((i) => i.a.declinedAt && !i.a.joined && !i.a.waitlisted && !i.a.pendingApproval).length;
  const notSent = invitees.filter((i) => !i.a.invitationSentAt && !i.a.joined).length;
  const waiting = invitees.length - accepted - declined - notSent;

  return (
    <section className="mb-6 rounded-md border border-grey/15 p-4" aria-labelledby="invited-heading">
      <p id="invited-heading" className="mb-1 text-xs uppercase tracking-wide text-grey">
        Invited ({invitees.length})
      </p>

      {invitees.length === 0 ? (
        <p className="text-sm text-grey">No one has been invited yet.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink">
            {accepted} accepted · {waiting} waiting · {declined} declined
            {notSent > 0 && ` · ${notSent} not sent`}
          </p>
          <ul className="flex flex-col divide-y divide-grey/10">
            {invitees.map(({ a, status }) => (
              <li key={a.id} className="flex min-h-[44px] items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate text-ink">{a.member.name}</span>
                <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs ${TONE[status.tone]}`}>{status.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {writable && (
        <Link
          href={`/events/${eventId}/edit`}
          className="mt-3 inline-flex min-h-[44px] items-center text-sm text-deep-orange underline underline-offset-2"
        >
          Invite more or remove
        </Link>
      )}
    </section>
  );
}
