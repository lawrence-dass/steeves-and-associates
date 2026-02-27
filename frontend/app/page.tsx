"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import KpiCard from "@/components/ui/KpiCard";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DollarSign, Clock, Users, Briefcase, SlidersHorizontal, Gauge } from "lucide-react";

interface Kpis {
  total_revenue: number;
  total_hours: number;
  total_customers: number;
  total_resources: number;
  total_projects: number;
  avg_rate: number;
}

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  hours: number;
  active_customers: number;
}

interface LeaderboardPoint {
  name: string;
  revenue: number;
  hours: number;
  projects: number;
  secondary: number;
  avg_rate: number;
}

interface RevenueSharePoint {
  customer_name: string;
  revenue: number;
  pct: number;
}

type LeaderboardMode = "customers" | "resources";

const PIE_COLORS = [
  "#405189",
  "#3577f1",
  "#0ab39c",
  "#f7b84b",
  "#f06548",
  "#50a5f1",
  "#54c5eb",
  "#6f42c1",
];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split("-");
  const y = Number(year);
  const m = Number(monthPart);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function OverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPoint[]>([]);
  const [revenueShare, setRevenueShare] = useState<RevenueSharePoint[]>([]);

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [topLimit, setTopLimit] = useState(8);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("customers");

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const earliestMonth = availableMonths[0] || "";
  const latestMonth = availableMonths[availableMonths.length - 1] || "";

  const leaderboardTitle =
    leaderboardMode === "customers" ? "Top Customers by Revenue" : "Top Resources by Revenue";
  const leaderboardSecondaryLabel =
    leaderboardMode === "customers" ? "Resources Used" : "Clients";

  const revenuePerHour = useMemo(() => {
    if (!kpis || !kpis.total_hours) return 0;
    return kpis.total_revenue / kpis.total_hours;
  }, [kpis]);

  useEffect(() => {
    let active = true;

    async function loadFilterOptions() {
      try {
        const options = await fetchApi<Record<string, unknown>>("/api/overview/filter-options");
        const months = Array.isArray(options.available_months)
          ? options.available_months.map((m) => String(m)).filter(Boolean)
          : [];

        if (!active) return;

        const minMonth = String(options.min_month || months[0] || "");
        const maxMonth = String(options.max_month || months[months.length - 1] || "");

        setAvailableMonths(months);
        setStartMonth(minMonth);
        setEndMonth(maxMonth);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load filter options:", err);
      } finally {
        if (active) {
          setInitialized(true);
        }
      }
    }

    loadFilterOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    let active = true;

    async function loadOverviewData() {
      setLoading(true);

      const buildPath = (basePath: string, extra: Record<string, string> = {}) => {
        const params = new URLSearchParams();
        if (startMonth) params.set("start_month", startMonth);
        if (endMonth) params.set("end_month", endMonth);
        Object.entries(extra).forEach(([key, value]) => params.set(key, value));
        const query = params.toString();
        return query ? `${basePath}?${query}` : basePath;
      };

      const leaderboardPath =
        leaderboardMode === "customers" ? "/api/overview/top-customers" : "/api/overview/top-resources";

      try {
        const [kpiRows, trendRows, leaderboardRows, shareRows] = await Promise.all([
          fetchApi<Record<string, unknown>>(buildPath("/api/overview/kpis")),
          fetchApi<Array<Record<string, unknown>>>(buildPath("/api/overview/revenue-trend")),
          fetchApi<Array<Record<string, unknown>>>(buildPath(leaderboardPath, { limit: String(topLimit) })),
          fetchApi<Array<Record<string, unknown>>>(
            buildPath("/api/overview/revenue-by-customer", { limit: String(topLimit) })
          ),
        ]);

        if (!active) return;

        setKpis({
          total_revenue: toNumber(kpiRows.total_revenue),
          total_hours: toNumber(kpiRows.total_hours),
          total_customers: toNumber(kpiRows.total_customers),
          total_resources: toNumber(kpiRows.total_resources),
          total_projects: toNumber(kpiRows.total_projects),
          avg_rate: toNumber(kpiRows.avg_rate),
        });

        setTrend(
          trendRows.map((row) => ({
            month: String(row.month || ""),
            revenue: toNumber(row.revenue),
            hours: toNumber(row.hours),
            active_customers: toNumber(row.active_customers),
          }))
        );

        setLeaderboard(
          leaderboardRows
            .map((row) => {
              const name =
                leaderboardMode === "customers"
                  ? String(row.customer_name || "")
                  : String(row.resource_name || "");

              const secondary =
                leaderboardMode === "customers"
                  ? toNumber(row.resources_used)
                  : toNumber(row.clients);

              return {
                name,
                revenue: toNumber(row.revenue),
                hours: toNumber(row.hours),
                projects: toNumber(row.projects),
                secondary,
                avg_rate: toNumber(row.avg_rate),
              };
            })
            .filter((row) => row.name)
        );

        setRevenueShare(
          shareRows
            .map((row) => ({
              customer_name: String(row.customer_name || ""),
              revenue: toNumber(row.revenue),
              pct: toNumber(row.pct),
            }))
            .filter((row) => row.customer_name)
        );

        setError(null);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load overview data:", err);
        setError(err instanceof Error ? err.message : "Failed to load overview data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverviewData();
    return () => {
      active = false;
    };
  }, [initialized, startMonth, endMonth, topLimit, leaderboardMode]);

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const rangeLabel = startMonth && endMonth ? `${formatMonthLabel(startMonth)} to ${formatMonthLabel(endMonth)}` : "All available data";

  if (loading && !kpis && trend.length === 0 && leaderboard.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-steeves-muted">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Overview</h1>
        <p className="vz-subtitle mt-1">
          Filterable performance analytics across revenue, utilization, and customer mix
        </p>
      </div>

      <div className="vz-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-steeves-navy" />
            <h2 className="text-sm font-semibold text-[#495057]">Interactive Filters</h2>
          </div>
          <p className="text-xs text-steeves-muted">Selected range: {rangeLabel}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="text-xs font-medium text-steeves-muted">
            Start Month
            <select
              className="vz-input mt-1 w-full"
              value={startMonth}
              onChange={(e) => {
                const nextValue = e.target.value;
                setStartMonth(nextValue);
                if (endMonth && nextValue > endMonth) {
                  setEndMonth(nextValue);
                }
              }}
              disabled={!availableMonths.length}
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            End Month
            <select
              className="vz-input mt-1 w-full"
              value={endMonth}
              onChange={(e) => {
                const nextValue = e.target.value;
                setEndMonth(nextValue);
                if (startMonth && nextValue < startMonth) {
                  setStartMonth(nextValue);
                }
              }}
              disabled={!availableMonths.length}
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Top N
            <select
              className="vz-input mt-1 w-full"
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
            >
              {[5, 8, 10, 12, 15, 20].map((value) => (
                <option key={value} value={value}>
                  Top {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Leaderboard
            <select
              className="vz-input mt-1 w-full"
              value={leaderboardMode}
              onChange={(e) => setLeaderboardMode(e.target.value as LeaderboardMode)}
            >
              <option value="customers">Customers</option>
              <option value="resources">Resources</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              className="w-full rounded-md border border-steeves-border px-3 py-2 text-sm font-medium text-steeves-ink hover:bg-steeves-light"
              onClick={() => {
                setTopLimit(8);
                setLeaderboardMode("customers");
                setStartMonth(earliestMonth);
                setEndMonth(latestMonth);
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load data from the backend API. {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-steeves-muted">Updating charts for selected filters...</p>
      )}

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(kpis.total_revenue)}
            icon={<DollarSign size={20} />}
          />
          <KpiCard
            title="Billable Hours"
            value={kpis.total_hours.toLocaleString()}
            icon={<Clock size={20} />}
          />
          <KpiCard
            title="Active Customers"
            value={kpis.total_customers}
            icon={<Users size={20} />}
          />
          <KpiCard
            title="Projects"
            value={kpis.total_projects}
            subtitle={`Avg billing rate: $${kpis.avg_rate}/hr`}
            icon={<Briefcase size={20} />}
          />
          <KpiCard
            title="Realized $ / Hour"
            value={formatCurrency(revenuePerHour)}
            icon={<Gauge size={20} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-4">Revenue and Hours Trend</h2>
          {trend.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-steeves-muted">
              No data for selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatMonthLabel(String(v))}
                />
                <YAxis
                  yAxisId="revenue"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(toNumber(v) / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="hours"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${toNumber(v).toLocaleString()}`}
                />
                <Tooltip
                  labelFormatter={(value) => formatMonthLabel(String(value))}
                  formatter={(value: number | string, name: string) => {
                    const numeric = toNumber(value);
                    if (name === "Revenue") {
                      return [formatCurrency(numeric), "Revenue"];
                    }
                    return [`${numeric.toLocaleString()} hrs`, "Billable Hours"];
                  }}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#3577f1"
                  strokeWidth={2.4}
                  dot={false}
                />
                <Line
                  yAxisId="hours"
                  type="monotone"
                  dataKey="hours"
                  name="Billable Hours"
                  stroke="#0ab39c"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">{leaderboardTitle}</h2>
          <p className="text-xs text-steeves-muted mb-3">Ranked by revenue for the selected period</p>
          {leaderboard.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-steeves-muted">
              No data for selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={leaderboard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(toNumber(v) / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number | string, key: string, ctx: { payload?: LeaderboardPoint }) => {
                    if (key === "revenue") {
                      return [formatCurrency(toNumber(value)), "Revenue"];
                    }
                    return [String(value), key];
                  }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as LeaderboardPoint | undefined;
                    if (!row) return String(label);
                    return `${label} | ${row.hours.toLocaleString()} hrs | ${leaderboardSecondaryLabel}: ${row.secondary}`;
                  }}
                />
                <Bar dataKey="revenue" fill="#405189" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Revenue Share Concentration</h2>
          <p className="text-xs text-steeves-muted mb-3">Top {topLimit} customers by contribution</p>
          {revenueShare.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-steeves-muted">
              No data for selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueShare}
                  dataKey="revenue"
                  nameKey="customer_name"
                  innerRadius={58}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {revenueShare.map((entry, index) => (
                    <Cell key={entry.customer_name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | string) => [formatCurrency(toNumber(value)), "Revenue"]}
                  labelFormatter={(label) => String(label)}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Monthly Active Customers</h2>
          <p className="text-xs text-steeves-muted mb-3">Distinct customers generating billable activity per month</p>
          {trend.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-steeves-muted">
              No data for selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatMonthLabel(String(v))}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(value) => formatMonthLabel(String(value))}
                  formatter={(value: number | string) => [`${toNumber(value)} customers`, "Active Customers"]}
                />
                <Bar dataKey="active_customers" fill="#0ab39c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
