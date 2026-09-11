import Link from "next/link";
import { type MemberLifecycleStatus } from "@prequate/core";
import { EyebrowLabel } from "@/components/eyebrow-label";
import { LifecycleBadge } from "@/components/lifecycle-badge";

// The persistent parent context shown at the top of every /members/[id]/*
// page — name, status, and the way into Edit — regardless of which
// sub-page (Overview/Activity/Timeline) is open.
export function MemberHeader({
  member,
  writable,
}: {
  member: { id: string; name: string; lifecycleStatus: string };
  writable: boolean;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <EyebrowLabel>Member profile</EyebrowLabel>
        <h1 className="font-display text-[2.75rem] italic leading-[1.02] tracking-[-0.01em] text-ink">
          {member.name}
        </h1>
        <div className="mt-2">
          <LifecycleBadge status={member.lifecycleStatus as MemberLifecycleStatus} />
        </div>
      </div>
      {writable && (
        <Link
          href={`/members/${member.id}/edit`}
          className="flex-shrink-0 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Edit
        </Link>
      )}
    </div>
  );
}
