import { verifyOtp } from "@/lib/actions/auth";

export default function VerifyOtpPage({
  searchParams,
}: {
  searchParams: { phone?: string; demoCode?: string; error?: string };
}) {
  const phone = searchParams.phone ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Enter your code</h1>
        <p className="mb-6 text-sm text-grey">Sent to {phone}.</p>

        {searchParams.demoCode && (
          <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">
            No SMS provider is connected in this prototype. Your code is{" "}
            <span className="font-bold">{searchParams.demoCode}</span>.
          </p>
        )}

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-deep-orange">
            That code didn&apos;t match, or has expired. Request a new one.
          </p>
        )}

        <form action={verifyOtp} className="flex flex-col gap-3">
          <input type="hidden" name="phone" value={phone} />
          <input
            type="text"
            name="code"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            className="w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-center text-lg tracking-[0.3em] text-ink"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Continue
          </button>
        </form>

        <a
          href="/login/phone"
          className="mt-6 block w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Use a different number
        </a>
      </div>
    </main>
  );
}
