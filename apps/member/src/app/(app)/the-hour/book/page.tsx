import Link from "next/link";
import { prisma } from "@prequate/db";
import { BackLink } from "@/components/back-link";

export default async function BookPartnerPage({
  searchParams,
}: {
  searchParams: { parentBookingId?: string };
}) {
  const partners = await prisma.user.findMany({
    where: { role: "PARTNER" },
    orderBy: { name: "asc" },
  });

  const parentParam = searchParams.parentBookingId
    ? `&parentBookingId=${searchParams.parentBookingId}`
    : "";

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        Book a session
      </h1>
      <p className="mb-10 text-sm text-grey">Choose who you want to spend the Hour with.</p>

      <ul className="flex flex-col divide-y divide-grey/15">
        {partners.map((partner) => (
          <li key={partner.id} className="py-4">
            <Link
              href={`/the-hour/book/slot?partnerId=${partner.id}${parentParam}`}
              className="block"
            >
              <p className="font-display text-xl italic leading-tight text-ink">{partner.name}</p>
              {partner.bio && <p className="mt-1 text-sm text-grey">{partner.bio}</p>}
            </Link>
          </li>
        ))}
      </ul>

      <BackLink href="/the-hour" />
    </div>
  );
}
