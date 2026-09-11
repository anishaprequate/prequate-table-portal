"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";

// Shared by the new-post and edit-post pages: the title/subheading/tags/
// image/body fields, plus a live Preview that renders exactly how the
// member-facing post page looks (see apps/member .../insight/[id]/page.tsx)
// — same prose-post typography, so what's previewed here is what publishes.
export function InsightFormFields({
  authorName,
  defaultTitle,
  defaultSubheading,
  defaultTags,
  defaultImageUrl,
  initialBody,
}: {
  authorName: string;
  defaultTitle?: string;
  defaultSubheading?: string;
  defaultTags?: string;
  defaultImageUrl?: string | null;
  initialBody?: string;
}) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [subheading, setSubheading] = useState(defaultSubheading ?? "");
  const [tags, setTags] = useState(defaultTags ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImageUrl ?? null);
  const [body, setBody] = useState(initialBody ?? "");
  const [previewing, setPreviewing] = useState(false);

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        Title
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Subheading
        <input
          type="text"
          name="subheading"
          value={subheading}
          onChange={(e) => setSubheading(e.target.value)}
          placeholder="One line, under the title."
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Tags
        <input
          type="text"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma-separated, e.g. Fundraising, Hiring"
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
        />
      </label>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="w-full rounded-md object-cover" />
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        {imageUrl ? "Replace image" : "Image (optional)"}
        <input
          type="file"
          name="image"
          accept="image/*"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setImageUrl(URL.createObjectURL(file));
          }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Body
        <RichTextEditor name="body" initialContent={initialBody} onChangeHTML={setBody} />
      </label>

      <button
        type="button"
        onClick={() => setPreviewing(true)}
        className="w-fit rounded-md border border-grey/30 px-5 py-3 text-sm font-medium text-ink transition hover:border-grey/60"
      >
        Preview
      </button>

      {previewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
          <div className="mx-auto max-w-2xl px-6 py-10">
            <button
              type="button"
              onClick={() => setPreviewing(false)}
              className="mb-8 rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
            >
              Close preview
            </button>

            <h1 className="mb-1 font-display text-5xl italic leading-[1.05] text-ink sm:text-6xl">
              {title || "Untitled"}
            </h1>
            {subheading && <p className="mb-6 text-xl leading-snug text-grey">{subheading}</p>}

            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/10 font-display text-sm text-ink">
                {authorName.charAt(0)}
              </div>
              <div className="text-sm">
                <p className="font-medium text-ink">{authorName}</p>
                <p className="text-grey">Draft preview</p>
              </div>
            </div>

            {tagList.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {tagList.map((tag) => (
                  <span key={tag} className="rounded-full bg-orange/10 px-2.5 py-1 text-xs text-deep-orange">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="mb-10 h-[280px] w-full rounded-md object-cover md:h-[420px]"
              />
            )}

            <div className="prose-post text-lg leading-loose" dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        </div>
      )}
    </>
  );
}
