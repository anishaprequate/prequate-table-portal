import { EyebrowLabel } from "@/components/eyebrow-label";

export function PageHero({
  eyebrow,
  title,
  accent,
  subtitle,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10">
      {eyebrow && <EyebrowLabel>{eyebrow}</EyebrowLabel>}
      <h1 className="font-display text-[2.75rem] italic leading-[1.02] tracking-[-0.01em] text-ink sm:text-[3.5rem]">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-deep-orange">{accent}</span>
          </>
        )}
      </h1>
      {subtitle && <p className="mt-4 max-w-lg text-sm leading-relaxed text-grey">{subtitle}</p>}
    </div>
  );
}
