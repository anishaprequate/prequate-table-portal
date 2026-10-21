import Link from "next/link";
import type { PendingSurvey } from "@/lib/home";

// Quiet and always there until answered: the survey for an event you went to.
export function SurveyNudgeCard({ survey }: { survey: PendingSurvey }) {
  return (
    <section className="panel-foil mb-8 flex flex-col gap-2 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-taupe">How was it?</p>
      <p className="text-sm text-ink">Two questions about {survey.title}. It takes a minute.</p>
      <Link href={`/events/${survey.eventId}/survey`} className="btn-ghost tap w-fit !px-0">
        Answer now
      </Link>
    </section>
  );
}
