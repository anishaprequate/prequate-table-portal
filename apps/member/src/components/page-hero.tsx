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
    <div className="mb-12">
      {eyebrow && <EyebrowLabel>{eyebrow}</EyebrowLabel>}
      <h1 className="font-display text-[3.25rem] italic leading-[1.02] tracking-[-0.01em] text-ink sm:text-[4.75rem]">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-deep-orange">{accent}</span>
          </>
        )}
      </h1>
      {subtitle && <p className="mt-5 max-w-lg text-base leading-relaxed text-grey">{subtitle}</p>}
    </div>
  );
}
