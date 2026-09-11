"use client";

import { useRouter } from "next/navigation";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ORANGE = "#FF9633";
const DEEP_ORANGE = "#F96900";
const INK = "#161616";
const GREY_TICK = { fontSize: 12, fill: "#707070" };

// No onClick navigation here — readership is already ranked in full on this
// page, and the underlying viewers list per post isn't a separate concept
// worth its own page, unlike the month/group/partner buckets elsewhere.
export function InsightReadershipChart({ data }: { data: { postId: string; title: string; views: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={GREY_TICK} />
        <YAxis type="category" dataKey="title" width={160} tick={{ ...GREY_TICK, fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="views" name="Views" fill={DEEP_ORANGE} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IntroActivityChart({ data }: { data: { month: string; label: string; count: number }[] }) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={GREY_TICK} />
        <YAxis allowDecimals={false} tick={GREY_TICK} />
        <Tooltip />
        <Bar
          dataKey="count"
          name="Requests"
          fill={ORANGE}
          radius={[4, 4, 0, 0]}
          onClick={(row: any) => router.push(`/reports/directory-content/${row.month}`)}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResponseTimeChart({
  data,
}: {
  data: { label: string; rmHours: number; partnerHours: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" />
        <XAxis dataKey="label" tick={GREY_TICK} />
        <YAxis allowDecimals={false} unit="h" tick={GREY_TICK} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="rmHours" name="RM" stroke={DEEP_ORANGE} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="partnerHours" name="Partner" stroke={INK} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
