import { requestMagicLink } from "@/lib/actions/auth";

export default function EmailLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Sign in with your email</h1>
        <p className="mb-8 text-sm leading-relaxed text-taupe">
          We&apos;ll send a one-tap link to the email on your profile. It works once, and expires in 15 minutes.
        </p>

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-clay">
            That link has expired or already been used. Request a new one below.
          </p>
        )}
        {searchParams.error === "missing" && (
          <p className="mb-4 text-sm text-clay">Enter an email address to continue.</p>
        )}

        <form action={requestMagicLink} className="flex flex-col gap-3">
          <input type="email" name="email" required placeholder="you@company.com" className="input-field" />
          <button type="submit" className="btn-primary w-full">
            Send me a link
          </button>
        </form>

        <a href="/login" className="btn-secondary mt-6 block w-full">
          Back
        </a>
      </div>
    </main>
  );
}
