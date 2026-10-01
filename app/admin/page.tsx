"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";
import {
  ActivityIcon,
  RepeatIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminApiError, getAdmin } from "@/components/admin/admin-api-client";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCount,
  formatDeviceType,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  orUnavailable,
} from "@/lib/analytics-format";
import type {
  BreakdownItem,
  CityBreakdownItem,
  CountryBreakdownItem,
  DashboardStats,
  PageBreakdownItem,
  RecentVisitorItem,
  TimeSeriesPoint,
} from "@/types/analytics";

interface StatsResponse {
  success: boolean;
  range: { preset: string; label: string };
  granularity: string;
  stats: DashboardStats;
  series: TimeSeriesPoint[];
  countries: CountryBreakdownItem[];
  cities: CityBreakdownItem[];
  pages: PageBreakdownItem[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  sources: BreakdownItem[];
  recentVisitors: RecentVisitorItem[];
}

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#0891b2",
  "#be185d",
  "#65a30d",
  "#7c3aed",
];

async function fetchStats(query: string): Promise<StatsResponse> {
  return getAdmin<StatsResponse>(`/api/admin/stats?${query}`);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function DashboardView({ data }: { data: StatsResponse }) {
  const { stats, series, countries, cities, pages, devices, browsers, sources, recentVisitors } =
    data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data.range.label} · {data.granularity} buckets
          </p>
        </div>
        <DateRangePicker />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visitors in range"
          value={formatNumber(stats.visitorsInRange)}
          hint={`of ${formatNumber(stats.totalVisitors)} all time`}
          Icon={UsersIcon}
        />
        <StatCard
          label="New visitors"
          value={formatNumber(stats.newVisitorsInRange)}
          hint="first seen in range"
          Icon={UserPlusIcon}
        />
        <StatCard
          label="Active now"
          value={formatNumber(stats.activeVisitors)}
          hint={`last ${stats.activeWindowMinutes} min`}
          Icon={ActivityIcon}
        />
        <StatCard
          label="Returning"
          value={formatNumber(stats.returningVisitors)}
          hint={formatPercent(stats.returningRate)}
          Icon={RepeatIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Visitors over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#visitorsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devices}
                    dataKey="visitors"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {devices.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {devices.slice(0, 5).map((item, index) => (
                <li key={item.key} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-muted-foreground">{formatPercent(item.share)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Top countries"
          items={countries.map((c) => ({
            key: c.key,
            label: c.flag ? `${c.flag} ${c.label}` : c.label,
            visitors: c.visitors,
            share: c.share,
          }))}
        />
        <BreakdownCard
          title="Top cities"
          items={cities.map((c) => ({
            key: c.key,
            label: c.countryName ? `${c.label}, ${c.countryName}` : c.label,
            visitors: c.visitors,
            share: c.share,
          }))}
        />
        <BreakdownCard
          title="Top pages"
          items={pages.map((p) => ({
            key: p.key,
            label: p.path,
            visitors: p.visitors,
            share: p.share,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={browsers}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="visitors" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Traffic sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sources}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="visitors" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent visitors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">IP</th>
                  <th className="pb-2 pr-4 font-medium">Location</th>
                  <th className="pb-2 pr-4 font-medium">Device</th>
                  <th className="pb-2 pr-4 font-medium">Page</th>
                  <th className="pb-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((visitor) => (
                  <tr key={visitor.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs">{visitor.ip}</td>
                    <td className="py-2.5 pr-4">
                      {visitor.countryFlag} {orUnavailable(visitor.countryName)}
                      {visitor.city ? `, ${visitor.city}` : ""}
                    </td>
                    <td className="py-2.5 pr-4">
                      {formatDeviceType(visitor.deviceType)} · {orUnavailable(visitor.browser)}
                    </td>
                    <td className="max-w-40 truncate py-2.5 pr-4 font-mono text-xs">
                      {orUnavailable(visitor.page)}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {formatRelativeTime(visitor.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: BreakdownItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data in range.</p>
        ) : (
          <ul className="space-y-2.5">
            {items.slice(0, 6).map((item) => (
              <li key={item.key}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatCount(item.visitors)} · {formatPercent(item.share)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, item.share * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardInner({ query }: { query: string }) {
  const data = use(fetchStats(query));
  return <DashboardView data={data} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardWithParams />
    </Suspense>
  );
}

function DashboardWithParams() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return <DashboardInner query={query} />;
}