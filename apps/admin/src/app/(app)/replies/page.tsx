import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentAdmin } from "@/lib/session";
import { formatSlot } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

// Members reply privately to a dinner's question. A reply is read by the
// event's host partner and by the full admins (the owner and Amogh). A partner
// sees only the dinners they host; an associate sees none.
export default async function RepliesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  const fullAdmin = admin.role === "ADMIN_OWNER" || admin.role === "ADMIN_RM";
  if (!fullAdmin && admin.role !== "PARTNER") redirect("/");

  const events = await prisma.event.findMany({
    where: {
      dinnerQuestion: { not: null },
      archivedAt: null,
      ...(fullAdmin ? {} : { hostPartnerId: admin.id }),
    },
    orderBy: { startTime: "desc" },
    include: { questionReplies: { orderBy: { createdAt: "asc" }, include: { member: { select: { name: true } } } } },
  });

  return (
    <div className="max-w-2xl">
      <PageHero
        title="Table questions"
        subtitle={fullAdmin ? "Private replies from members to each dinner's question." : "Private replies from members to the dinners you host."}
      />

      {events.length === 0 && <p className="text-sm text-grey">{fullAdmin ? "No dinner has a question yet." : "None of your dinners has a question yet."}</p>}

      <div className="flex flex-col gap-8">
        {events.map((e) => (
          <section key={e.id}>
            <p className="font-display text-2xl italic leading-tight text-ink">{e.title}</p>
            <p className="mb-2 text-xs text-grey">{formatSlot(e.startTime)}</p>
            <p className="mb-4 text-sm text-deep-orange">{e.dinnerQuestion}</p>
            <ul className="flex flex-col gap-3">
              {e.questionReplies.map((r) => (
                <li key={r.id} className="rounded-md border border-grey/15 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wide text-grey">{r.member.name}</p>
                  <p className="whitespace-pre-line text-sm text-ink">{r.body}</p>
                </li>
              ))}
              {e.questionReplies.length === 0 && <p className="text-sm text-grey">No replies yet.</p>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
