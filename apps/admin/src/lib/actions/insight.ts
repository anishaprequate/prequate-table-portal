"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@prequate/db";
import { UPLOADS_DIR } from "@prequate/core";
import { getCurrentAdmin, isFullAdmin, canWrite } from "@/lib/session";

async function storeImage(postId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storedName = `${postId}-${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, storedName), buffer);

  return `/api/briefs/${storedName}`;
}

// Body is authored as HTML by the rich-text editor. Sanitize on the way in
// so only ever-safe markup reaches storage — the member app renders it with
// dangerouslySetInnerHTML and trusts this boundary, not the reverse.
function sanitizeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "img"],
    allowedAttributes: { img: ["src", "alt"] },
    allowedSchemesByTag: { img: ["http", "https"] },
    allowedSchemesAppliedToAttributes: [],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: attribs.src?.startsWith("/api/briefs/") ? attribs : {},
      }),
    },
  });
}

function parseTags(raw: FormDataEntryValue | null): string | null {
  const tags = String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? JSON.stringify(tags) : null;
}

// Called directly from the rich-text editor's "insert image" button, not
// via a form submission — inline images can be added before the post
// itself has an id, so there is nothing to key the stored filename on
// besides a fresh random one.
export async function uploadInlineImage(formData: FormData): Promise<string | null> {
  const admin = await getCurrentAdmin();
  if (!admin || !canWrite(admin.role)) return null;

  return storeImage(crypto.randomUUID(), formData.get("image"));
}

export async function createInsightPost(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!canWrite(admin.role)) redirect("/insight");

  const title = String(formData.get("title") ?? "").trim();
  const subheading = String(formData.get("subheading") ?? "").trim() || null;
  const rawBody = String(formData.get("body") ?? "").trim();
  if (!title || !rawBody) redirect("/insight/new?error=incomplete");
  const body = sanitizeBody(rawBody);
  const tags = parseTags(formData.get("tags"));

  // A full admin's own post needs no review and goes live immediately; a
  // partner's post is held for a full admin to approve first.
  const selfPublishes = isFullAdmin(admin.role);

  const post = await prisma.insightPost.create({
    data: {
      title,
      subheading,
      body,
      tags,
      authorId: admin.id,
      status: selfPublishes ? "PUBLISHED" : "IN_REVIEW",
      publishedAt: selfPublishes ? new Date() : null,
    },
  });

  const imageUrl = await storeImage(post.id, formData.get("image"));
  if (imageUrl) {
    await prisma.insightPost.update({ where: { id: post.id }, data: { imageUrl } });
  }

  revalidatePath("/insight");
  redirect(selfPublishes ? `/insight?published=1` : `/insight?submitted=1`);
}

export async function updateInsightPost(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const post = await prisma.insightPost.findUnique({ where: { id } });
  if (!post) redirect("/insight");
  if (!canWrite(admin.role) || (post.authorId !== admin.id && !isFullAdmin(admin.role))) {
    redirect(`/insight/${id}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  const subheading = String(formData.get("subheading") ?? "").trim() || null;
  const body = sanitizeBody(String(formData.get("body") ?? "").trim());
  const tags = parseTags(formData.get("tags"));

  const imageUrl = await storeImage(id, formData.get("image"));

  // A partner editing their own rejected (or still in-review) post resubmits
  // it for review on save. A full admin's edits never change review state —
  // their posts don't go through review in the first place.
  const resubmits = !isFullAdmin(admin.role) && (post.status === "REJECTED" || post.status === "IN_REVIEW");

  await prisma.insightPost.update({
    where: { id },
    data: {
      title,
      subheading,
      body,
      tags,
      ...(imageUrl ? { imageUrl } : {}),
      ...(resubmits ? { status: "IN_REVIEW", reviewNote: null } : {}),
    },
  });

  revalidatePath("/insight");
  revalidatePath(`/insight/${id}`);
  redirect(`/insight/${id}?saved=1`);
}

export async function approveInsightPost(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/insight");

  const id = String(formData.get("id") ?? "");

  await prisma.insightPost.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), reviewNote: null },
  });

  revalidatePath("/insight");
  revalidatePath(`/insight/${id}`);
  redirect(`/insight/${id}?saved=1`);
}

export async function rejectInsightPost(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (!isFullAdmin(admin.role) || !canWrite(admin.role)) redirect("/insight");

  const id = String(formData.get("id") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;

  await prisma.insightPost.update({
    where: { id },
    data: { status: "REJECTED", reviewNote },
  });

  revalidatePath("/insight");
  revalidatePath(`/insight/${id}`);
  redirect(`/insight/${id}?saved=1`);
}
