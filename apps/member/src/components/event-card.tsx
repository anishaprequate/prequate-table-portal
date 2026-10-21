import Link from "next/link";
import { EVENT_TIER_LABELS, type EventTier } from "@prequate/core";
import { formatSlot } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { LogoMark } from "@/components/wordmark";
import { RsvpButton, type JoinFormConfig, type RsvpState } from "@/components/rsvp-button";

export interface EventCardData {
  id: string;
  title: string;
  startTime: Date;
  location: string | null;
  imageUrl: string | null;
  tier: string;
  cancelled: boolean;
  past: boolean;
  approvalRequired: boolean;
  closed: boolean;
  form: JoinFormConfig | null;
  state: RsvpState;
  goingCount: number;
  spotsLeft: number | null;
  goingFaces: { name: string; photoUrl: string | null }[];
}

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short" });

const TONES = { bone: "card", night: "panel-night", clay: "panel-clay" } as const;

// tone gives a list some rhythm: the card can sit light, dark, or in clay.
export function EventCard({ event, tone = "bone" }: { event: EventCardData; tone?: keyof typeof TONES }) {
  const tierLabel = EVENT_TIER_LABELS[event.tier as EventTier] ?? event.tier;
  const showRsvp = !event.past && !event.cancelled;

  return (
    <article className={`${TONES[tone]} overflow-hidden animate-fade-up`}>
      <Link href={`/events/${event.id}`} className="tap block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-foil/10">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt=""
              className={`h-full w-full object-cover ${event.past ? "grayscale-[40%]" : ""}`}
              draggable={false}
            />
          ) : (
            <div
              className="grain relative flex h-full w-full items-center justify-center text-foil/50"
              style={{ background: "linear-gradient(150deg, rgb(var(--c-foil) / 0.25), rgb(var(--c-bone)) 70%)" }}
            >
              <LogoMark className="h-14 w-14" />
            </div>
          )}

          <div className="absolute left-3 top-3 flex w-12 flex-col items-center rounded-md bg-bone/95 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase tracking-[0.18em] text-taupe">{MONTH.format(event.startTime)}</span>
            <span className="font-display text-xl leading-none text-ink">{event.startTime.getDate()}</span>
          </div>

          <div className="absolute right-3 top-3 flex gap-2">
            {event.cancelled && (
              <span className="rounded-full bg-night/80 px-2.5 py-1 text-[11px] text-cream">Cancelled</span>
            )}
            {event.closed && (
              <span className="rounded-full bg-night/80 px-2.5 py-1 text-[11px] text-cream">By invitation</span>
            )}
            <span className="rounded-full bg-bone/90 px-2.5 py-1 text-[11px] text-gold">{tierLabel}</span>
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <h3 className="font-display text-2xl italic leading-tight text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-taupe">
            {formatSlot(event.startTime)}
            {event.location && ` · ${event.location}`}
          </p>

          {(event.goingFaces.length > 0 || event.spotsLeft !== null) && !event.cancelled && (
            <div className="mt-3 flex items-center justify-between gap-3">
              {event.goingFaces.length > 0 ? (
                <div className="flex items-center">
                  {event.goingFaces.map((f) => (
                    <Avatar
                      key={f.name}
                      name={f.name}
                      photoUrl={f.photoUrl}
                      size="sm"
                      className="-ml-2 ring-2 !ring-bone first:ml-0"
                    />
                  ))}
                  {event.goingCount > event.goingFaces.length && (
                    <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-taupe/10 text-[11px] text-taupe ring-2 ring-bone">
                      +{event.goingCount - event.goingFaces.length}
                    </span>
                  )}
                </div>
              ) : (
                <span />
              )}
              {event.spotsLeft !== null && !event.past && (
                <span className="text-xs text-gold">
                  {event.spotsLeft > 0 ? `${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left` : "Full"}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {showRsvp && (
        <div className="px-5 pb-5">
          <RsvpButton
            eventId={event.id}
            state={event.state}
            closed={event.closed}
            approvalRequired={event.approvalRequired}
            form={event.form}
          />
        </div>
      )}
    </article>
  );
}
