import Link from "next/link";
import { formatSlot, formatDateOnly } from "@/lib/format";
import type { ThisMonth } from "@/lib/home";
import { QuestionReply } from "./question-reply";
import { AskTheTable } from "./ask-the-table";
import { OfferCard } from "@/components/hour/offer-card";

const label = "text-xs uppercase tracking-[0.28em] text-taupe";

// "This month at the table": four parts, any of which can be empty. The hour
// and "ask the table" are always present, so the card is never blank.
export function ThisMonthCard({ data, people }: { data: ThisMonth; people: { id: string; name: string }[] }) {
  const { offer, hour, question, book, pulseLine } = data;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="this-month">
      <h2 id="this-month" className="mb-5 font-display text-3xl font-semibold text-ink">
        This month at the table
      </h2>

      {offer && (
        <div className="mb-5">
          <OfferCard offer={offer} />
        </div>
      )}

      <div className="flex flex-col divide-y divide-taupe/12">
        {/* Your hour */}
        <div className="pb-5">
          <p className={label}>Your Hour</p>
          {hour.state === "booked" && hour.startTime && (
            <>
              <p className="mt-2 text-base text-ink">
                Booked with {hour.partnerName?.split(" ")[0]}, {formatSlot(hour.startTime)}.
              </p>
              <Link href={`/the-hour/${hour.bookingId}`} className="btn-ghost tap mt-1 !px-0">
                See the details
              </Link>
            </>
          )}
          {hour.state === "held" && hour.startTime && (
            <p className="mt-2 text-base text-ink">
              Your {hour.monthName} Hour was with {hour.partnerName?.split(" ")[0]} on {formatDateOnly(hour.startTime)}.
            </p>
          )}
          {hour.state === "open" && (
            <>
              <p className="mt-2 text-base text-ink">
                {hour.invitation ?? `Your ${hour.monthName} Hour is open. Take time with a partner when it suits you.`}
              </p>
              <Link href="/the-hour/book" className="btn-primary tap mt-3 !py-2.5">
                Book your Hour
              </Link>
            </>
          )}
        </div>

        {/* The question */}
        {question && (
          <div className="py-5">
            <p className={label}>The question</p>
            <p className="mt-2 font-display text-xl italic leading-snug text-ink">{question.question}</p>
            <p className="mt-1 text-xs text-taupe">For {question.eventTitle}.</p>
            <QuestionReply eventId={question.eventId} hostFirstName={question.hostFirstName} initial={question.reply} />
          </div>
        )}

        {/* Ask the table */}
        <div className="py-5">
          <p className={`${label} mb-3`}>Ask the table</p>
          <AskTheTable people={people} />
        </div>

        {/* The book */}
        {book && (
          <div className="pt-5">
            <p className={`${label} mb-3`}>The book</p>
            <div className="flex items-center gap-4">
              <div
                aria-hidden
                className="relative h-20 w-14 flex-shrink-0 rounded-sm bg-ink shadow-md"
                style={{ boxShadow: "inset 4px 0 0 rgba(201,164,85,0.55), 0 6px 14px rgba(22,22,22,0.18)" }}
              >
                <span className="absolute inset-x-2 top-3 h-px bg-foil/70" />
                <span className="absolute inset-x-2 top-5 h-px bg-foil/40" />
              </div>
              <div>
                <p className="font-display text-xl italic leading-tight text-ink">{book.title}</p>
                {book.author && <p className="text-sm text-taupe">{book.author}</p>}
                {book.dinnerAt && (
                  <p className="mt-1 text-xs text-clay">Author dinner: {formatSlot(book.dinnerAt)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {pulseLine && (
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.28em] text-taupe/70">{pulseLine}</p>
      )}
    </section>
  );
}
