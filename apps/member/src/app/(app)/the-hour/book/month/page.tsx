import { redirect } from "next/navigation";

// The old step by step booking pages. Booking is now the calendar on one page,
// and every Hour is a request the partner confirms, so these go there.
export default function Page() {
  redirect("/the-hour/book");
}
