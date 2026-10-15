import { verifyOtp } from "@/lib/actions/auth";

export default function VerifyOtpPage({
  searchParams,
}: {
  searchParams: { phone?: string; demoCode?: string; error?: string };
}) {
  const phone = searchParams.phone ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Enter your code</h1>
        <p className="mb-6 text-sm text-taupe">Sent to {phone}.</p>

        {searchParams.demoCode && (
          <p className="card mb-6 bg-foil/5 px-3 py-2 text-sm text-ink">
            No SMS provider is connected in this prototype. Your code is{" "}
            <span className="font-bold">{searchParams.demoCode}</span>.
          </p>
        )}

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-clay">
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
            className="input-field text-center text-lg tracking-[0.3em]"
          />
          <button type="submit" className="btn-primary w-full">
            Continue
          </button>
        </form>

        <a href="/login/phone" className="btn-secondary mt-6 block w-full">
          Use a different number
        </a>
      </div>
    </main>
  );
}
