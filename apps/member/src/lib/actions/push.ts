"use server";

import { headers } from "next/headers";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

// A device the member has just allowed notifications on.
export async function savePushSubscription(input: PushSubscriptionInput): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const endpoint = String(input?.endpoint ?? "");
  const p256dh = String(input?.keys?.p256dh ?? "");
  const auth = String(input?.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return { ok: false };

  const userAgent = headers().get("user-agent")?.slice(0, 250) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    update: { userId: user.id, p256dh, auth, userAgent },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}
