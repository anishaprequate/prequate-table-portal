import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@prequate/db";
import { UPLOADS_DIR } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Gallery photos are visible only to members who attended (joined) this
// specific event — unlike /api/briefs/[filename], which only checks that
// someone is logged in. That's a real per-object permission check, not
// just hiding the gallery section in the UI (operating rule 6).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; filename: string } },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not authorized", { status: 401 });

  const attendance = await prisma.eventAttendance.findUnique({
    where: { eventId_memberId: { eventId: params.id, memberId: user.id } },
  });
  if (!attendance?.joined) return new NextResponse("Not authorized", { status: 403 });

  const filename = path.basename(params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(file, {
      headers: { "Content-Type": contentType, "Content-Disposition": "inline" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
