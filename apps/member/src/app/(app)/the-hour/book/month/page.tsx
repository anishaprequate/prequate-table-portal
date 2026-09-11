import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BackLink } from "@/components/back-link";

const MONTH_NAME = new Intl.DateTimeFormat("en-IN", { month: "long" });

export default async function ChooseHourMonthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        Which month?
      </h1>
      <p className="mb-10 text-sm text-grey">One session each, for this month and next.</p>

      <ul className="flex flex-col divide-y divide-grey/15">
        <li className="py-4">
          <Link href="/the-hour/book?month=0" className="block">
            <p className="font-display text-xl italic leading-tight text-ink">
              {MONTH_NAME.format(currentMonthStart)}
            </p>
          </Link>
        </li>
        <li className="py-4">
          <Link href="/the-hour/book?month=1" className="block">
            <p className="font-display text-xl italic leading-tight text-ink">
              {MONTH_NAME.format(nextMonthStart)}
            </p>
          </Link>
        </li>
      </ul>

      <BackLink href="/the-hour" />
    </div>
  );
}
