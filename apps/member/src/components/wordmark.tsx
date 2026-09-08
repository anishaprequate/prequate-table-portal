export function Wordmark() {
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-50 flex min-h-[48px] items-center bg-paper/90 px-6 py-4 backdrop-blur-sm">
      <span className="font-sans text-base font-bold tracking-wide">
        <span className="text-grey">PRE</span>
        <span className="text-orange">QUATE</span>
      </span>
    </div>
  );
}
