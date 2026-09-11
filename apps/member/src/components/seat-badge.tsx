import { formatSeatDisplay } from "@/lib/format";

export function SeatBadge({ seatNumber }: { seatNumber: string | null | undefined }) {
  const display = formatSeatDisplay(seatNumber);
  if (!display) return null;

  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-5xl not-italic text-deep-orange">{display}</span>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-grey">Seat</span>
    </div>
  );
}
