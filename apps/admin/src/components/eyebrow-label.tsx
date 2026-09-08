export function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-grey">
      <span className="h-px w-6 bg-deep-orange" />
      {children}
    </p>
  );
}
