import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@prequate/core";
import { getCurrentUser } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
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
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const isImage = contentType.startsWith("image/");

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": isImage
          ? "inline"
          : `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
