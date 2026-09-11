"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { uploadInlineImage } from "@/lib/actions/insight";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-2.5 py-1.5 text-sm transition ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-grey/10"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  name,
  initialContent,
  onChangeHTML,
}: {
  name: string;
  initialContent?: string;
  // Optional, additive: fires on every edit for a live preview elsewhere on
  // the page. Doesn't touch the hidden-input-on-submit sync above, which
  // stays the only thing the actual form submission depends on.
  onChangeHTML?: (html: string) => void;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[240px] rounded-md border border-grey/30 bg-paper px-4 py-3 text-sm text-ink focus:outline-none",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChangeHTML?.(editor.getHTML()),
  });

  // Sync at submit time rather than on every keystroke: React 18 Strict
  // Mode's dev-only double-mount can leave an earlier render's onUpdate
  // closure writing into a hidden input that's already been detached, so a
  // per-keystroke sync is unreliable. Reading editor.getHTML() right as the
  // form submits, against whichever hidden input is currently live, isn't.
  useEffect(() => {
    const form = hiddenInputRef.current?.closest("form");
    if (!form || !editor) return;

    const handleSubmit = () => {
      if (hiddenInputRef.current) hiddenInputRef.current.value = editor.getHTML();
    };
    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [editor]);

  if (!editor) return null;

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    const formData = new FormData();
    formData.set("image", file);
    const url = await uploadInlineImage(formData);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} ref={hiddenInputRef} defaultValue={initialContent ?? ""} />

      <div className="flex flex-wrap gap-1 rounded-md border border-grey/30 bg-paper px-1.5 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •&nbsp;List
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;&rdquo;
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => fileInputRef.current?.click()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </ToolbarButton>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImagePick}
          className="hidden"
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
