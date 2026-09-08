import { NextResponse } from "next/server";
import { prisma } from "@prequate/db";
import { getCurrentAdmin, canView } from "@/lib/session";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) return new NextResponse("Not authorized", { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      attendances: { include: { member: true }, orderBy: { createdAt: "asc" } },
      ticketTypes: true,
    },
  });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const ticketTypeName = (id: string | null) => event.ticketTypes.find((t) => t.id === id)?.name ?? "";

  const header = [
    "Name",
    "Status",
    "Ticket type",
    "Guest count",
    "Guests",
    "Checked in",
    "Dietary",
    "Travel",
  ];

  const rows = event.attendances.map((a) => {
    const status = a.pendingApproval
      ? "Pending approval"
      : a.waitlisted
        ? "Waitlisted"
        : a.joined
          ? "Joined"
          : a.invited
            ? "Invited"
            : "—";
    const guests = a.guestNames ? (JSON.parse(a.guestNames) as string[]).join("; ") : "";
    return [
      a.member.name,
      status,
      ticketTypeName(a.ticketTypeId),
      String(a.guestCount),
      guests,
      a.checkedInAt ? "Yes" : "No",
      a.dietaryNotes ?? "",
      a.travelNotes ?? "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-zA-Z0-9_.-]/g, "_")}-guests.csv"`,
    },
  });
}
