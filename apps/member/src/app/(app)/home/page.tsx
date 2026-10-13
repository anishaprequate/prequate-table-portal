import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSelfSeat, consumeNewSeatCaption, getRoomSatellites } from "@/lib/room";
import { getPartnerAvailabilityLines, getRoomPulseLine } from "@/lib/partner-availability";
import { formatSeatDisplay } from "@/lib/format";
import { Greeting } from "@/components/greeting";
import { RoomWheel } from "@/components/room/room-wheel";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const firstName = user.name.split(" ")[0];

  const [self, satellites, newSeatCaption, availability, pulseLine] = await Promise.all([
    getSelfSeat(user.id),
    getRoomSatellites(user.id),
    consumeNewSeatCaption(user.id),
    getPartnerAvailabilityLines(),
    getRoomPulseLine(),
  ]);

  const captionText = newSeatCaption
    ? `Seat ${formatSeatDisplay(String(newSeatCaption.seatNumber))} was taken on ${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(newSeatCaption.filledAt)}.`
    : null;

  return (
    <div className="max-w-2xl">
      <p className="mb-10 text-sm text-taupe">
        <Greeting fallback={greeting(now.getHours())} /> {firstName}.
      </p>

      <RoomWheel seatNumber={self.seatNumber} seatingDate={self.seatingDate} satellites={satellites} />

      {captionText && <p className="mt-6 text-center text-xs text-taupe">{captionText}</p>}

      {(availability.length > 0 || pulseLine) && (
        <div className="mt-14 flex flex-col gap-2 border-t border-taupe/12 pt-8">
          {availability.map((line) => (
            <p key={line.partnerId} className="text-sm text-taupe">
              {line.text}
            </p>
          ))}
          {pulseLine && (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-taupe/70">{pulseLine}</p>
          )}
        </div>
      )}
    </div>
  );
}
