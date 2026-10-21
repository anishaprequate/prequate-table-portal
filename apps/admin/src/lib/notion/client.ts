// A thin Notion REST client over fetch, so the sync adds no dependency.
// Needs NOTION_TOKEN (an internal integration secret) and the integration
// must be shared with both databases.

const NOTION_VERSION = "2025-09-03";
const BASE = "https://api.notion.com/v1";

export const MASTER_DATA_SOURCE =
  process.env.NOTION_MASTER_DS ?? "bc2e17a6-c054-8343-a6e6-8714f6f5af56";
export const ACTIVITY_DATA_SOURCE =
  process.env.NOTION_ACTIVITY_DS ?? "b89eee0d-d3a6-4c07-871d-9d1865301feb";

export function notionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

async function call<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN is not set");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Notion allows about three requests a second. Back off and retry.
  if (res.status === 429 && attempt < 4) {
    const wait = Number(res.headers.get("retry-after") ?? "1") * 1000;
    await new Promise((r) => setTimeout(r, Math.max(wait, 500)));
    return call<T>(method, path, body, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export async function queryAll(dataSourceId: string, filter?: unknown): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await call<{ results: NotionPage[]; has_more: boolean; next_cursor: string | null }>(
      "POST",
      `/data_sources/${dataSourceId}/query`,
      { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}), ...(filter ? { filter } : {}) },
    );
    pages.push(...res.results);
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

export async function updatePage(pageId: string, properties: Record<string, unknown>) {
  await call("PATCH", `/pages/${pageId}`, { properties });
}

export async function createPage(dataSourceId: string, properties: Record<string, unknown>) {
  return call<NotionPage>("POST", "/pages", {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties,
  });
}

// Property value builders, in the shape the API expects.
export const prop = {
  title: (text: string) => ({ title: [{ text: { content: text } }] }),
  text: (text: string) => ({ rich_text: text ? [{ text: { content: text } }] : [] }),
  number: (n: number) => ({ number: n }),
  select: (name: string) => ({ select: { name } }),
  date: (iso: string) => ({ date: { start: iso } }),
  relation: (ids: string[]) => ({ relation: ids.map((id) => ({ id })) }),
};
