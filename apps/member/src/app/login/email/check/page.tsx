export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Check your email</h1>
        <p className="mb-8 text-sm text-grey">
          If that address matches a membership, a sign-in link is on its way. Tap it within 15 minutes.
        </p>

        <a
          href="/login"
          className="block w-full rounded-md border border-grey/30 px-5 py-3 text-center text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
