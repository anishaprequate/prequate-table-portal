export default function CheckEmailPage() {
  return (
    <main className="flex min-h-app flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <h1 className="mb-2 font-display text-3xl italic leading-tight text-ink">Check your email</h1>
        <p className="mb-8 text-sm leading-relaxed text-taupe">
          If that address matches a membership, a sign-in link is on its way. Tap it within 15 minutes.
        </p>

        <a href="/login" className="btn-secondary block w-full">
          Back to sign in
        </a>
      </div>
    </main>
  );
}
