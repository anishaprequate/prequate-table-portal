import { MEMBER_LIFECYCLE_BADGE, MEMBER_LIFECYCLE_LABELS, type MemberLifecycleStatus } from "@prequate/core";

const COLOR_CLASSES: Record<string, { solid: string; outline: string }> = {
  "deep-orange": { solid: "bg-deep-orange text-paper", outline: "border border-deep-orange text-deep-orange" },
  orange: { solid: "bg-orange text-paper", outline: "border border-orange text-orange" },
  grey: { solid: "bg-grey text-paper", outline: "border border-grey text-grey" },
  "grey-light": { solid: "bg-grey/30 text-paper", outline: "border border-grey/30 text-grey" },
};

export function LifecycleBadge({ status }: { status: MemberLifecycleStatus }) {
  const { variant, color } = MEMBER_LIFECYCLE_BADGE[status];
  const classes = COLOR_CLASSES[color][variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classes}`}
    >
      {MEMBER_LIFECYCLE_LABELS[status]}
    </span>
  );
}
