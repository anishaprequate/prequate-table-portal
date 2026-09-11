"use client";

import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DEEP_ORANGE = "#F96900";
const GREY_TICK = { fontSize: 12, fill: "#707070" };

export function PointsTrendChart({ data }: { data: { month: string; label: string; balance: number }[] }) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" />
        <XAxis dataKey="label" tick={GREY_TICK} />
        <YAxis allowDecimals={false} tick={GREY_TICK} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="balance"
          name="Points balance"
          stroke={DEEP_ORANGE}
          strokeWidth={2}
          dot={{ r: 4, cursor: "pointer" }}
          activeDot={{
            onClick: (_e: unknown, payload: any) => router.push(`/reports/members/points/${payload.payload.month}`),
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
