"use client";

import { useEffect, useRef, useState } from "react";

// The profile photo and its picker. The chosen photo shows in the circle at
// once, so the member sees what they are about to save. The file input stays
// inside the form, so Save uploads it as before.
export function PhotoPicker({ photoUrl, initial }: { photoUrl: string | null; initial: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? photoUrl;

  return (
    <div className="flex items-center gap-4">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-1 ring-taupe/10" draggable={false} />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-foil/10 font-display text-xl text-ink ring-1 ring-taupe/10">
          {initial}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <input
          ref={input}
          type="file"
          name="photo"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setFileName(file ? file.name : null);
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        <button type="button" onClick={() => input.current?.click()} className="btn-secondary tap min-h-[44px] !px-4 !py-2">
          {shown ? "Replace photo" : "Add a photo"}
        </button>
        <p className="w-full truncate text-xs text-taupe" aria-live="polite">
          {fileName ? `${fileName}. Save to keep it.` : "JPG or PNG"}
        </p>
      </div>
    </div>
  );
}
