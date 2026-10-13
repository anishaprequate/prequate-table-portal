import Link from "next/link";
import { LogoMark } from "@/components/wordmark";

export default function LoginChoicePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <span className="mb-6 inline-flex text-foil">
          <LogoMark className="h-9 w-9" />
        </span>
        <h1 className="mb-2 font-display text-4xl italic leading-tight text-ink">The Prequate Table</h1>
        <p className="mb-10 text-sm leading-relaxed text-taupe">
          Sign in with your plate, your phone number, or your email.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/login/tap" className="btn-primary w-full">
            Tap your plate
          </Link>
          <Link href="/login/phone" className="btn-secondary w-full">
            Use your phone number instead
          </Link>
          <Link href="/login/email" className="btn-secondary w-full">
            Use your email instead
          </Link>
        </div>
      </div>
    </main>
  );
}
