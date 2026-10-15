import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { requestIntroduction } from "@/lib/actions/members";
import { INTRODUCTION_STATUS_LABELS, type IntroductionStatus } from "@prequate/core";
import { BackLink } from "@/components/back-link";
import { SeatBadge } from "@/components/seat-badge";
import { Avatar } from "@/components/avatar";

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { requested?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const member = await prisma.user.findFirst({
    where: { id: params.id, role: "MEMBER", directoryOptOut: false },
  });
  if (!member) notFound();

  const [firstName, ...rest] = member.name.split(" ");
  const lastName = rest.join(" ");

  const existingRequest =
    member.id === user.id
      ? null
      : await prisma.introductionRequest.findFirst({
          where: { requesterId: user.id, targetId: member.id },
        });

  return (
    <div className="max-w-md">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3">
          <SeatBadge seatNumber={member.seatNumber} />
          <Avatar name={member.name} photoUrl={member.photoUrl} size="lg" />
          <h1 className="min-w-0 break-words font-display text-4xl italic leading-[1.02] tracking-[-0.01em] text-ink sm:text-[2.75rem]">
            {firstName} <span className="text-clay">{lastName}</span>
          </h1>
        </div>

        {member.linkedinUrl && (
          <a
            href={member.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on LinkedIn`}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-taupe transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/5 hover:text-ink"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.36 4.25 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
        )}
      </div>

      {member.seatType && <p className="mb-6 text-sm text-taupe">{member.seatType}</p>}

      {searchParams.requested && (
        <p className="card mb-6 animate-fade-up bg-foil/5 px-3 py-2 text-sm text-ink">
          Introduction requested. We'll follow up.
        </p>
      )}

      {(member.longBio ?? member.bio) && (
        <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed">
          {member.longBio ?? member.bio}
        </p>
      )}

      {member.id !== user.id && (
        <>
          {existingRequest ? (
            <p className="text-sm text-taupe">
              Introduction{" "}
              <Link
                href={`/members/requests/${existingRequest.id}`}
                className="underline decoration-foil/40 underline-offset-2 transition-colors duration-300 hover:text-ink hover:decoration-foil"
              >
                {INTRODUCTION_STATUS_LABELS[existingRequest.status as IntroductionStatus].toLowerCase()}
              </Link>
              .
            </p>
          ) : (
            <form action={requestIntroduction} className="flex flex-col gap-4">
              <input type="hidden" name="targetId" value={member.id} />

              <label className="flex flex-col gap-1.5 text-sm">
                Why would you like to be introduced?
                <textarea
                  name="message"
                  rows={3}
                  placeholder="A line or two of context helps the introduction land well."
                  className="input-field"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                Best way to reach you
                <select name="preferredChannel" defaultValue="" className="input-field w-fit">
                  <option value="">Email</option>
                  <option value="Phone">Phone</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                Anything they should see first — website, company, LinkedIn
                <input type="text" name="contactDetails" placeholder="e.g. acme.com" className="input-field" />
              </label>

              <button type="submit" className="btn-primary w-fit">
                Request an introduction
              </button>
            </form>
          )}
        </>
      )}

      <BackLink href="/members" />
    </div>
  );
}
