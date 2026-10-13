import Link from "next/link";
import { prisma } from "@prequate/db";
import { BackLink } from "@/components/back-link";

export default async function BookPartnerPage({
  searchParams,
}: {
  searchParams: { parentBookingId?: string; month?: string };
}) {
  const partners = await prisma.user.findMany({
    where: { role: "PARTNER" },
    orderBy: { name: "asc" },
  });

  const parentParam = searchParams.parentBookingId
    ? `&parentBookingId=${searchParams.parentBookingId}`
    : "";
  const monthParam = searchParams.month === "1" ? "&month=1" : "&month=0";

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        Book a session
      </h1>
      <p className="mb-10 text-sm text-taupe">Choose who you want to spend the Hour with.</p>

      <ul className="flex flex-col divide-y divide-taupe/15">
        {partners.map((partner) => (
          <li key={partner.id}>
            <Link
              href={`/the-hour/book/slot?partnerId=${partner.id}${parentParam}${monthParam}`}
              className="-mx-3 block rounded-md px-3 py-4 transition-colors duration-300 hover:bg-ink/[0.03]"
            >
              <p className="font-display text-xl italic leading-tight text-ink">{partner.name}</p>
              {partner.bio && <p className="mt-1 text-sm text-taupe">{partner.bio}</p>}
            </Link>
          </li>
        ))}
      </ul>

      <BackLink href="/the-hour" />
    </div>
  );
}
