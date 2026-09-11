"use client";

import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const DEEP_ORANGE = "#F96900";
const GREY_TICK = { fontSize: 12, fill: "#707070" };

export function HourChart({
  data,
}: {
  data: { partnerId: string; partnerName: string; booked: number; available: number }[];
}) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={GREY_TICK} />
        <YAxis type="category" dataKey="partnerName" width={110} tick={GREY_TICK} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="booked"
          name="Booked"
          fill={DEEP_ORANGE}
          radius={[0, 4, 4, 0]}
          onClick={(row: any) => router.push(`/reports/hour/${row.partnerId}`)}
          cursor="pointer"
        />
        <Bar dataKey="available" name="Members still eligible" fill="rgba(22,22,22,0.12)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
