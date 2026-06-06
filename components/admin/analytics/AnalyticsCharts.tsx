'use client';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const GRID   = '#2a2a2a';
const TICK   = '#6b7280';
const COLORS = ['#E50914', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

interface DailyPoint { date: string; watchTimeMinutes: number; views: number; completionRate: number }
interface BarItem    { title?: string; email?: string; watchTimeMinutes: number; views?: number; videos?: number }
interface PieItem    { name: string; value: number }

function tip(color: string) {
  return {
    contentStyle: { background: '#1a1a1a', border: `1px solid ${GRID}`, borderRadius: 8, color: '#e5e5e5', fontSize: 12 },
    labelStyle:   { color: '#9ca3af' },
    itemStyle:    { color },
  };
}

export function WatchTimeLine({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#E50914" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#E50914" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="date"             tick={{ fill: TICK, fontSize: 11 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fill: TICK, fontSize: 11 }} />
        <Tooltip {...tip('#E50914')} formatter={(v) => [`${v} min`, 'Watch Time']} />
        <Area type="monotone" dataKey="watchTimeMinutes" stroke="#E50914" fill="url(#wt)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DailyViewsLine({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="date"  tick={{ fill: TICK, fontSize: 11 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fill: TICK, fontSize: 11 }} />
        <Tooltip {...tip('#3b82f6')} formatter={(v) => [v, 'Views']} />
        <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopVideosBar({ data }: { data: BarItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fill: TICK, fontSize: 11 }} />
        <YAxis type="category" dataKey="title" tick={{ fill: TICK, fontSize: 11 }} width={100}
               tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} />
        <Tooltip {...tip('#E50914')} formatter={(v) => [`${v} min`, 'Watch Time']} />
        <Bar dataKey="watchTimeMinutes" fill="#E50914" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopUsersBar({ data }: { data: BarItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fill: TICK, fontSize: 11 }} />
        <YAxis type="category" dataKey="email" tick={{ fill: TICK, fontSize: 11 }} width={100}
               tickFormatter={v => v.split('@')[0].slice(0, 12)} />
        <Tooltip {...tip('#8b5cf6')} formatter={(v) => [`${v} min`, 'Watch Time']} />
        <Bar dataKey="watchTimeMinutes" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompletionPie({ data }: { data: PieItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
             dataKey="value" nameKey="name" paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: '#1a1a1a', border: `1px solid ${GRID}`, borderRadius: 8, color: '#e5e5e5', fontSize: 12 }} />
        <Legend iconType="circle" wrapperStyle={{ color: TICK, fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CompletionTrendLine({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="date" tick={{ fill: TICK, fontSize: 11 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fill: TICK, fontSize: 11 }} domain={[0, 100]} />
        <Tooltip {...tip('#10b981')} formatter={(v) => [`${v}%`, 'Completion Rate']} />
        <Line type="monotone" dataKey="completionRate" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
