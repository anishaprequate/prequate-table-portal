import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSelfSeat, consumeNewSeatCaption, getRoomSatellites, getNextUp } from "@/lib/room";
import { formatRelative } from "@/lib/relative-time";
import { prisma } from "@prequate/db";
import {
  getSinceLastVisit,
  getThisMonth,
  getGettingReady,
  getOnTheDay,
  getSeatStats,
  getIntroductionChoices,
} from "@/lib/home";
import { formatSeatDisplay } from "@/lib/format";
import { Greeting } from "@/components/greeting";
import { RoomWheel } from "@/components/room/room-wheel";
import { ThisMonthCard } from "@/components/home/this-month-card";
import { GettingReadyCard } from "@/components/home/getting-ready-card";
import { OnTheDayCard } from "@/components/home/on-the-day-card";
import { YourSeatCard } from "@/components/home/your-seat-card";

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

  const [self, satellites, newSeatCaption, nextUp, since, thisMonth, gettingReady, onTheDay, seat, people] = await Promise.all([
    getSelfSeat(user.id),
    getRoomSatellites(user.id),
    consumeNewSeatCaption(user.id),
    getNextUp(user.id),
    getSinceLastVisit(user),
    getThisMonth(user),
    getGettingReady(user),
    getOnTheDay(user),
    getSeatStats(user),
    getIntroductionChoices(user.id),
  ]);

  // Everything above was read against the previous visit; now move it on.
  await prisma.user.update({ where: { id: user.id }, data: { homeSeenAt: now } });

  const captionText = newSeatCaption
    ? `Seat ${formatSeatDisplay(String(newSeatCaption.seatNumber))} was taken on ${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(newSeatCaption.filledAt)}.`
    : null;

  return (
    <div className="max-w-2xl overflow-x-clip">
      <h1 className="mb-12 font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
        <Greeting fallback={greeting(now.getHours())} /> <span className="italic text-clay">{firstName}.</span>
      </h1>

      <RoomWheel
        seatNumber={self.seatNumber}
        seatingDate={self.seatingDate}
        satellites={satellites}
        nextUp={
          nextUp
            ? { title: nextUp.title, startsAt: nextUp.startsAt.toISOString(), whenText: formatRelative(nextUp.startsAt, now) }
            : null
        }
      />

      {captionText && <p className="mt-6 text-center text-xs text-taupe">{captionText}</p>}

      <div className="mt-12">
        {since && <p className="mb-6 text-sm text-taupe">{since}</p>}
        <ThisMonthCard data={thisMonth} people={people} />
        {gettingReady && <GettingReadyCard data={gettingReady} />}
        {onTheDay && <OnTheDayCard data={onTheDay} />}
        <YourSeatCard stats={seat} />
        {/* The latest table letter goes here once its content exists (b5). */}
      </div>
    </div>
  );
}
