import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// Place suggestions for "Ask the table" reservations, from Google Places
// Autocomplete (New). The key stays on the server: the phone only ever talks
// to this route, and only when signed in. Without GOOGLE_PLACES_API_KEY the
// route says so, and the sheet falls back to typing the place in by hand.

const ENDPOINT = process.env.GOOGLE_PLACES_ENDPOINT ?? "https://places.googleapis.com/v1/places:autocomplete";

// A small per-member limit, so a stuck client cannot run up the bill.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();

function allowed(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

interface Suggestion {
  placeId: string;
  name: string;
  address: string;
}

async function ask(key: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ configured: false, suggestions: [] });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const token = (request.nextUrl.searchParams.get("t") ?? "").slice(0, 64);
  if (q.length < 3) return NextResponse.json({ configured: true, suggestions: [] });
  if (!allowed(user.id)) return NextResponse.json({ error: "Slow down a little" }, { status: 429 });

  const base = { input: q, regionCode: "IN", ...(token ? { sessionToken: token } : {}) };
  try {
    // Restaurants, hotels and the like. If Google rejects the type filter,
    // ask again without it rather than showing nothing.
    let res = await ask(key, { ...base, includedPrimaryTypes: ["restaurant", "hotel", "cafe", "bar", "lodging"] });
    if (res.status === 400) res = await ask(key, base);
    if (!res.ok) return NextResponse.json({ configured: true, suggestions: [], unavailable: true });

    const data = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        };
      }[];
    };

    const suggestions: Suggestion[] = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .slice(0, 6)
      .map((p) => ({
        placeId: p.placeId!,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        address: p.structuredFormat?.secondaryText?.text ?? "",
      }))
      .filter((s) => s.name);

    return NextResponse.json({ configured: true, suggestions });
  } catch {
    return NextResponse.json({ configured: true, suggestions: [], unavailable: true });
  }
}
