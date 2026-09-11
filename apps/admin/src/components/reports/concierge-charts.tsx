"use client";

import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ORANGE = "#FF9633";
const DEEP_ORANGE = "#F96900";
const INK = "#161616";
const GREY_TICK = { fontSize: 12, fill: "#707070" };

export function ConciergeVolumeChart({
  data,
}: {
  data: { month: string; label: string; volume: number; avgDays: number }[];
}) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,22,22,0.08)" />
        <XAxis dataKey="label" tick={GREY_TICK} />
        <YAxis yAxisId="volume" allowDecimals={false} tick={GREY_TICK} />
        <YAxis yAxisId="days" orientation="right" allowDecimals={false} tick={GREY_TICK} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="volume"
          type="monotone"
          dataKey="volume"
          name="Requests"
          stroke={DEEP_ORANGE}
          strokeWidth={2}
          dot={{ r: 4, cursor: "pointer" }}
          activeDot={{
            onClick: (_e: unknown, payload: any) => router.push(`/reports/concierge/month/${payload.payload.month}`),
          }}
        />
        <Line
          yAxisId="days"
          type="monotone"
          dataKey="avgDays"
          name="Avg days to fulfill"
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ServicesDonutChart({ data }: { data: { group: string; count: number }[] }) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="group"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          onClick={(row: any) => router.push(`/reports/concierge/group/${encodeURIComponent(row.group)}`)}
          cursor="pointer"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={[DEEP_ORANGE, ORANGE, "rgba(22,22,22,0.25)"][i % 3]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
