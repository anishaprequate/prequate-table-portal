import { adminLogin } from "@/lib/actions/auth";
import { PasswordInput } from "@/components/password-input";
import { PageHero } from "@/components/page-hero";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-app flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <PageHero title="Admin" accent="console" subtitle="Bookings, events, and content." />

        {searchParams.error === "invalid" && (
          <p className="mb-4 text-sm text-deep-orange" role="alert">
            That username and password did not match. Try again.
          </p>
        )}
        {searchParams.error === "wait" && (
          <p className="mb-4 text-sm text-deep-orange" role="alert">
            Too many tries. Wait ten minutes, then try again.
          </p>
        )}

        {/* A plain form with standard field names, so the browser can offer to
            save the password and fill it in next time. */}
        <form action={adminLogin} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Username
            <input
              type="text"
              name="username"
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="min-h-[44px] w-full rounded-md border border-grey/30 bg-paper px-3 py-3 text-base text-ink md:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Password
            <PasswordInput name="password" id="password" required label="Password" />
          </label>
          <button
            type="submit"
            className="mt-1 min-h-[44px] w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
