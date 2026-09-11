import { requestMagicLink } from "@/lib/actions/auth";

export default function EmailLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Sign in with your email</h1>
        <p className="mb-8 text-sm text-grey">
          We&apos;ll send a one-tap link to the email on your profile. It works once, and expires in 15 minutes.
        </p>

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-deep-orange">
            That link has expired or already been used. Request a new one below.
          </p>
        )}
        {searchParams.error === "missing" && (
          <p className="mb-4 text-sm text-deep-orange">Enter an email address to continue.</p>
        )}

        <form action={requestMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-sm text-ink"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Send me a link
          </button>
        </form>

        <a
          href="/login"
          className="mt-6 block w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Back
        </a>
      </div>
    </main>
  );
}
