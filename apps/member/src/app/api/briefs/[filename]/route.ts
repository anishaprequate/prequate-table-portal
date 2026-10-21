import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { loadUpload } from "@prequate/core";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not authorized", { status: 401 });

  const filename = path.basename(params.filename);

  // A file posted after an Hour belongs to that Hour's member alone. Anyone
  // else gets the same answer as for a file that does not exist.
  const brief = await prisma.brief.findFirst({
    where: { fileUrl: `/api/briefs/${filename}` },
    select: { booking: { select: { memberId: true } } },
  });
  if (brief && brief.booking.memberId !== user.id) return new NextResponse("Not found", { status: 404 });

  const stored = await loadUpload(filename);
  if (!stored) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const isImage = contentType.startsWith("image/");
  // An SVG can carry script, so it is always handed over as a download rather
  // than drawn inline on this site.
  const inline = isImage && ext !== ".svg";

  return new NextResponse(new Uint8Array(stored.data), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": inline ? "inline" : `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      // Private to the person who asked; never kept by a shared cache.
      "Cache-Control": "private, max-age=300",
    },
  });
}
