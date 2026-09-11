import Link from "next/link";

export default function LoginChoicePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 font-display text-4xl italic leading-tight text-ink">The Prequate Table</h1>
        <p className="mb-10 text-sm text-grey">Sign in with your plate, your phone number, or your email.</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login/tap"
            className="w-full rounded-md bg-ink px-5 py-3 text-center text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Tap your plate
          </Link>
          <Link
            href="/login/phone"
            className="w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Use your phone number instead
          </Link>
          <Link
            href="/login/email"
            className="w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
          >
            Use your email instead
          </Link>
        </div>
      </div>
    </main>
  );
}
