// What a partner can post after an Hour, as the member sees it.
export const POST_KIND_LABELS: Record<string, string> = {
  NOTES: "Meeting notes",
  BRIEF: "Brief",
  OBSERVATION: "Follow-up",
  FILE: "File",
};

export const postKindLabel = (kind: string | null | undefined) => POST_KIND_LABELS[kind ?? ""] ?? "Notes";
