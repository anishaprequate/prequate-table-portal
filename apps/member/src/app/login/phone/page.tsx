import { requestOtp } from "@/lib/actions/auth";

export default function PhoneLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Sign in with your phone</h1>
        <p className="mb-8 text-sm text-grey">
          We&apos;ll send a code to the number on your profile.
        </p>

        {searchParams.error === "not-found" && (
          <p className="mb-4 text-sm text-deep-orange">
            We couldn&apos;t find that number. Check it and try again.
          </p>
        )}
        {searchParams.error === "missing" && (
          <p className="mb-4 text-sm text-deep-orange">Enter a phone number to continue.</p>
        )}

        <form action={requestOtp} className="flex flex-col gap-3">
          <input
            type="tel"
            name="phone"
            required
            placeholder="+91 98100 00014"
            className="w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-sm text-ink"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Send code
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
