import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { UPLOADS_DIR } from "./uploads";

// Where uploaded files live.
//
//   hour     Hour files a partner or the team posts to a member
//   insight  images in Insight posts
//   photo    photos of members, partners and advisors
//   local    event covers, event photos and sponsor logos: the uploads folder
//
// The first three are private buckets in Supabase Storage. Nothing is public:
// every file is read by the apps with the service key and handed to a member
// only after the app has checked who is asking.
export type UploadKind = "hour" | "insight" | "photo" | "local";

const BUCKETS: Record<Exclude<UploadKind, "local">, string> = {
  hour: "hour-files",
  insight: "insight-images",
  photo: "profile-photos",
};

// A stored name starts with its kind, so a file is found in one request. Files
// uploaded before this existed have no prefix; they are looked for everywhere.
const PREFIXES: Record<Exclude<UploadKind, "local">, string> = {
  hour: "hour--",
  insight: "insight--",
  photo: "photo--",
};

export const UPLOAD_BUCKETS = BUCKETS;

let cached: SupabaseClient | null | undefined;
function supabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  // The dashboard's "Data API" address can carry a path (/rest/v1/). Only the
  // origin is wanted.
  cached = createClient(new URL(url).origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

const kindOfName = (name: string): Exclude<UploadKind, "local"> | null => {
  for (const k of Object.keys(PREFIXES) as (keyof typeof PREFIXES)[]) if (name.startsWith(PREFIXES[k])) return k;
  return null;
};

// Remember where an old, unprefixed file turned out to be.
const found = new Map<string, UploadKind>();

// Save an upload and return the stored name (what goes into the database URL,
// /api/briefs/<name>). Without Supabase configured, everything is written to the
// uploads folder, so a fresh checkout still works.
export async function saveUpload(kind: UploadKind, baseName: string, data: Buffer, contentType?: string): Promise<string> {
  const client = supabase();
  if (kind === "local" || !client) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, baseName), data);
    return baseName;
  }
  const name = PREFIXES[kind] + baseName;
  const { error } = await client.storage.from(BUCKETS[kind]).upload(name, data, {
    contentType: contentType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Could not store the file: ${error.message}`);
  return name;
}

export interface StoredFile {
  data: Buffer;
  kind: UploadKind;
}

// Read a stored file by name, from wherever it lives. Null when it is nowhere.
export async function loadUpload(name: string): Promise<StoredFile | null> {
  const safe = path.basename(name);
  const client = supabase();

  const tried = async (kind: Exclude<UploadKind, "local">): Promise<StoredFile | null> => {
    if (!client) return null;
    const { data, error } = await client.storage.from(BUCKETS[kind]).download(safe);
    if (error || !data) return null;
    found.set(safe, kind);
    return { data: Buffer.from(await data.arrayBuffer()), kind };
  };
  const onDisk = async (): Promise<StoredFile | null> => {
    try {
      const data = await readFile(path.join(UPLOADS_DIR, safe));
      found.set(safe, "local");
      return { data, kind: "local" };
    } catch {
      return null;
    }
  };

  const tagged = kindOfName(safe);
  if (tagged) return (await tried(tagged)) ?? (await onDisk());

  const known = found.get(safe);
  if (known === "local") return (await onDisk()) ?? null;
  if (known) return (await tried(known)) ?? null;

  for (const kind of ["hour", "insight", "photo"] as const) {
    const hit = await tried(kind);
    if (hit) return hit;
  }
  return onDisk();
}
