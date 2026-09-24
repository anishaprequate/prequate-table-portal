"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ORANGE = "#FF9633";
const DEEP_ORANGE = "#F96900";
const GREY_TICK = { fontSize: 12, fill: "#707070" };
const GRID_STROKE = "rgba(22,22,22,0.08)";

export function RegistrationsOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="date" tick={GREY_TICK} />
        <YAxis allowDecimals={false} tick={GREY_TICK} />
        <Tooltip />
        <Line type="monotone" dataKey="count" name="Registrations" stroke={DEEP_ORANGE} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TicketTypeBreakdownChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={GREY_TICK} />
        <YAxis type="category" dataKey="name" tick={GREY_TICK} width={120} />
        <Tooltip />
        <Bar dataKey="count" name="Registered" fill={ORANGE} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusBreakdownChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={GREY_TICK} />
        <YAxis type="category" dataKey="status" tick={GREY_TICK} width={100} />
        <Tooltip />
        <Bar dataKey="count" name="Attendees" fill={DEEP_ORANGE} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
