import Link from "next/link";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mt-10 hidden w-fit rounded-md bg-ink px-4 py-2 text-xs font-medium text-paper transition hover:bg-ink/90 md:inline-block"
    >
      {label}
    </Link>
  );
}
