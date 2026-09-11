import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";
import { BackLink } from "@/components/back-link";
import { CheckInKiosk } from "@/components/checkin-kiosk";

export default async function EventCheckInPage({ params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-center font-display text-3xl italic leading-tight text-ink">{event.title}</h1>
      <p className="mb-4 text-center text-sm text-grey">Door check-in</p>

      <CheckInKiosk mode="event" eventId={event.id} />

      <div className="flex justify-center">
        <BackLink href={`/events/${event.id}`} />
      </div>
    </div>
  );
}
