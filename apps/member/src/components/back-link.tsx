import Link from "next/link";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="btn-primary mt-10 hidden w-fit !px-4 !py-2 text-xs md:inline-flex"
    >
      {label}
    </Link>
  );
}
