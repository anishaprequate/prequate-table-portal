"use client";

import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ORANGE = "#FF9633";
const DEEP_ORANGE = "#F96900";
const GREY_TICK = { fontSize: 12, fill: "#707070" };
const TIER_LABELS: Record<string, string> = { DINNER: "Dinner", QUARTERLY: "Quarterly", ANNUAL: "Annual Gathering" };

export function AttendanceByTierChart({
  data,
}: {
  data: { tier: string; rsvpd: number; attended: number }[];
}) {
  const router = useRouter();
  const chartData = data.map((t) => ({ ...t, tierLabel: TIER_LABELS[t.tier] ?? t.tier }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" vertical={false} />
        <XAxis dataKey="tierLabel" tick={GREY_TICK} />
        <YAxis allowDecimals={false} tick={GREY_TICK} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="rsvpd"
          name="RSVP'd"
          fill="rgba(22,22,22,0.12)"
          radius={[4, 4, 0, 0]}
          onClick={(row: any) => router.push(`/reports/events/tier/${row.tier}`)}
          cursor="pointer"
        />
        <Bar
          dataKey="attended"
          name="Attended"
          fill={ORANGE}
          radius={[4, 4, 0, 0]}
          onClick={(row: any) => router.push(`/reports/events/tier/${row.tier}`)}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NoShowChart({
  data,
}: {
  data: { eventId: string; title: string; rate: number }[];
}) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" horizontal={false} />
        <XAxis type="number" unit="%" tick={GREY_TICK} />
        <YAxis type="category" dataKey="title" width={160} tick={{ ...GREY_TICK, fontSize: 11 }} />
        <Tooltip formatter={((v: number) => [`${v}%`, "No-show rate"]) as any} />
        <Bar
          dataKey="rate"
          name="No-show rate"
          fill={DEEP_ORANGE}
          radius={[0, 4, 4, 0]}
          onClick={(row: any) => router.push(`/events/${row.eventId}`)}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
