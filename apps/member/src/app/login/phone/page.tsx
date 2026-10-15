import { requestOtp } from "@/lib/actions/auth";

export default function PhoneLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Sign in with your phone</h1>
        <p className="mb-8 text-sm leading-relaxed text-taupe">
          We&apos;ll send a code to the number on your profile.
        </p>

        {searchParams.error === "not-found" && (
          <p className="mb-4 text-sm text-clay">
            We couldn&apos;t find that number. Check it and try again.
          </p>
        )}
        {searchParams.error === "missing" && (
          <p className="mb-4 text-sm text-clay">Enter a phone number to continue.</p>
        )}

        <form action={requestOtp} className="flex flex-col gap-3">
          <input type="tel" name="phone" required placeholder="+91 98100 00014" className="input-field" />
          <button type="submit" className="btn-primary w-full">
            Send code
          </button>
        </form>

        <a href="/login" className="btn-secondary mt-6 block w-full">
          Back
        </a>
      </div>
    </main>
  );
}
