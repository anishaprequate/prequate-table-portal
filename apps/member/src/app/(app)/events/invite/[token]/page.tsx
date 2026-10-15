import { notFound, redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export default async function EventInviteLinkPage({ params }: { params: { token: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await prisma.event.findUnique({ where: { inviteToken: params.token } });
  // A closed event is joined by invitation only. A forwarded link must never
  // make someone invited, so it does nothing here.
  if (!event || event.archivedAt || event.inviteOnly) notFound();

  await prisma.eventAttendance.upsert({
    where: { eventId_memberId: { eventId: event.id, memberId: user.id } },
    create: { eventId: event.id, memberId: user.id, invited: true },
    update: { invited: true },
  });

  redirect(`/events/${event.id}`);
}
