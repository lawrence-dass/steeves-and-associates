"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import KpiCard from "@/components/ui/KpiCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  Legend,
} from "recharts";
import { Trophy, Shield, MapPin, SlidersHorizontal, Target } from "lucide-react";

interface Competitor {
  company_name: string;
  location: string | null;
  num_employees: string | null;
  hourly_rate: string | null;
  hourly_rate_mid: number | null;
  cloud_focus_pct_num: number | null;
  cert_count: number;
  is_steeves: boolean;
  gold_certified: boolean;
  fasttrack_partner: boolean;
  elite_ems_partner: boolean;
  azure_circle_partner: boolean;
  leading_system_centre: boolean;
}

interface MarketSummary {
  total_companies: number;
  total_dataset_companies: number;
  fasttrack_count: number;
  gold_certified_count: number;
  avg_rate_mid: number | null;
  avg_cloud_focus: number | null;
  avg_cert_count: number | null;
  steeves: {
    company_name: string;
    hourly_rate_mid: number | null;
    cloud_focus_pct_num: number | null;
    cert_count: number;
    rate_rank: number | null;
    cloud_rank: number | null;
    cert_rank: number | null;
  } | null;
}

interface LocationGroup {
  location: string;
  count: number;
}

interface SizeGroup {
  num_employees: string;
  count: number;
}

interface FilterOptions {
  locations: string[];
  rate_min: number | null;
  rate_max: number | null;
  cloud_min: number | null;
  cloud_max: number | null;
  max_certs: number;
  total_companies: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  company_name: string;
  cert_count: number;
  location: string;
  is_steeves: boolean;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildRateSteps(minRate: number, maxRate: number): number[] {
  const floor = Math.floor(minRate / 5) * 5;
  const ceil = Math.ceil(maxRate / 5) * 5;
  const steps: number[] = [];
  for (let value = floor; value <= ceil; value += 5) {
    steps.push(value);
  }
  return steps;
}

export default function MarketPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [byLocation, setByLocation] = useState<LocationGroup[]>([]);
  const [bySize, setBySize] = useState<SizeGroup[]>([]);

  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [location, setLocation] = useState("all");
  const [minCerts, setMinCerts] = useState(0);
  const [minCloud, setMinCloud] = useState(0);
  const [minRate, setMinRate] = useState<number | null>(null);
  const [maxRate, setMaxRate] = useState<number | null>(null);
  const [topLimit, setTopLimit] = useState(12);
  const [includeSteeves, setIncludeSteeves] = useState(true);

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rateSteps = useMemo(() => {
    const rateMin = filterOptions?.rate_min;
    const rateMax = filterOptions?.rate_max;
    if (rateMin === null || rateMax === null || rateMin === undefined || rateMax === undefined) {
      return [];
    }
    return buildRateSteps(rateMin, rateMax);
  }, [filterOptions]);

  useEffect(() => {
    let active = true;

    async function loadFilterOptions() {
      try {
        const options = await fetchApi<Record<string, unknown>>("/api/competitors/filter-options");

        if (!active) return;

        const parsed: FilterOptions = {
          locations: Array.isArray(options.locations)
            ? options.locations.map((item) => String(item)).filter(Boolean)
            : [],
          rate_min: options.rate_min === null ? null : toNumber(options.rate_min),
          rate_max: options.rate_max === null ? null : toNumber(options.rate_max),
          cloud_min: options.cloud_min === null ? null : toNumber(options.cloud_min),
          cloud_max: options.cloud_max === null ? null : toNumber(options.cloud_max),
          max_certs: toNumber(options.max_certs || 5),
          total_companies: toNumber(options.total_companies || 0),
        };

        setFilterOptions(parsed);
        setMinRate(parsed.rate_min);
        setMaxRate(parsed.rate_max);
        setMinCloud(0);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load market filter options:", err);
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

    async function loadMarketData() {
      setLoading(true);

      const params = new URLSearchParams();
      if (location !== "all") params.set("location", location);
      params.set("min_certs", String(minCerts));
      params.set("min_cloud", String(minCloud));
      if (minRate !== null) params.set("min_rate", String(minRate));
      if (maxRate !== null) params.set("max_rate", String(maxRate));
      params.set("include_steeves", String(includeSteeves));
      const query = params.toString();

      const withQuery = (path: string) => (query ? `${path}?${query}` : path);

      try {
        const [allRows, summaryRow, locationRows, sizeRows] = await Promise.all([
          fetchApi<Array<Record<string, unknown>>>(withQuery("/api/competitors/all")),
          fetchApi<Record<string, unknown>>(withQuery("/api/competitors/summary")),
          fetchApi<Array<Record<string, unknown>>>(withQuery("/api/competitors/by-location")),
          fetchApi<Array<Record<string, unknown>>>(withQuery("/api/competitors/by-size")),
        ]);

        if (!active) return;

        setCompetitors(
          allRows.map((row) => ({
            company_name: String(row.company_name || ""),
            location: row.location ? String(row.location) : null,
            num_employees: row.num_employees ? String(row.num_employees) : null,
            hourly_rate: row.hourly_rate ? String(row.hourly_rate) : null,
            hourly_rate_mid: row.hourly_rate_mid === null ? null : toNumber(row.hourly_rate_mid),
            cloud_focus_pct_num: row.cloud_focus_pct_num === null ? null : toNumber(row.cloud_focus_pct_num),
            cert_count: toNumber(row.cert_count),
            is_steeves: Boolean(row.is_steeves),
            gold_certified: Boolean(row.gold_certified),
            fasttrack_partner: Boolean(row.fasttrack_partner),
            elite_ems_partner: Boolean(row.elite_ems_partner),
            azure_circle_partner: Boolean(row.azure_circle_partner),
            leading_system_centre: Boolean(row.leading_system_centre),
          }))
        );

        setSummary({
          total_companies: toNumber(summaryRow.total_companies),
          total_dataset_companies: toNumber(summaryRow.total_dataset_companies),
          fasttrack_count: toNumber(summaryRow.fasttrack_count),
          gold_certified_count: toNumber(summaryRow.gold_certified_count),
          avg_rate_mid: summaryRow.avg_rate_mid === null ? null : toNumber(summaryRow.avg_rate_mid),
          avg_cloud_focus: summaryRow.avg_cloud_focus === null ? null : toNumber(summaryRow.avg_cloud_focus),
          avg_cert_count: summaryRow.avg_cert_count === null ? null : toNumber(summaryRow.avg_cert_count),
          steeves: summaryRow.steeves
            ? {
                company_name: String((summaryRow.steeves as Record<string, unknown>).company_name || "Steeves and Associates"),
                hourly_rate_mid:
                  (summaryRow.steeves as Record<string, unknown>).hourly_rate_mid === null
                    ? null
                    : toNumber((summaryRow.steeves as Record<string, unknown>).hourly_rate_mid),
                cloud_focus_pct_num:
                  (summaryRow.steeves as Record<string, unknown>).cloud_focus_pct_num === null
                    ? null
                    : toNumber((summaryRow.steeves as Record<string, unknown>).cloud_focus_pct_num),
                cert_count: toNumber((summaryRow.steeves as Record<string, unknown>).cert_count),
                rate_rank:
                  (summaryRow.steeves as Record<string, unknown>).rate_rank === null
                    ? null
                    : toNumber((summaryRow.steeves as Record<string, unknown>).rate_rank),
                cloud_rank:
                  (summaryRow.steeves as Record<string, unknown>).cloud_rank === null
                    ? null
                    : toNumber((summaryRow.steeves as Record<string, unknown>).cloud_rank),
                cert_rank:
                  (summaryRow.steeves as Record<string, unknown>).cert_rank === null
                    ? null
                    : toNumber((summaryRow.steeves as Record<string, unknown>).cert_rank),
              }
            : null,
        });

        setByLocation(
          locationRows.map((row) => ({
            location: String(row.location || "Unknown"),
            count: toNumber(row.count),
          }))
        );

        setBySize(
          sizeRows.map((row) => ({
            num_employees: String(row.num_employees || "Unknown"),
            count: toNumber(row.count),
          }))
        );

        setError(null);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load market data:", err);
        setError(err instanceof Error ? err.message : "Failed to load market data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMarketData();
    return () => {
      active = false;
    };
  }, [initialized, location, minCerts, minCloud, minRate, maxRate, includeSteeves]);

  const rateLeaderboard = useMemo(
    () =>
      [...competitors]
        .filter((row) => row.hourly_rate_mid !== null)
        .sort((a, b) => (b.hourly_rate_mid || 0) - (a.hourly_rate_mid || 0))
        .slice(0, topLimit)
        .map((row) => ({
          name: row.company_name,
          mid: row.hourly_rate_mid || 0,
          cert_count: row.cert_count,
          isSteeves: row.is_steeves,
        })),
    [competitors, topLimit]
  );

  const certLeaderboard = useMemo(
    () =>
      [...competitors]
        .sort((a, b) => b.cert_count - a.cert_count || (b.hourly_rate_mid || 0) - (a.hourly_rate_mid || 0))
        .slice(0, topLimit)
        .map((row) => ({
          name: row.company_name,
          certs: row.cert_count,
          isSteeves: row.is_steeves,
        })),
    [competitors, topLimit]
  );

  const scatterData = useMemo(
    () =>
      competitors
        .filter((row) => row.hourly_rate_mid !== null && row.cloud_focus_pct_num !== null)
        .map((row) => ({
          x: row.cloud_focus_pct_num || 0,
          y: row.hourly_rate_mid || 0,
          company_name: row.company_name,
          cert_count: row.cert_count,
          location: row.location || "Unknown",
          is_steeves: row.is_steeves,
        })),
    [competitors]
  );

  const steevesPoint = scatterData.filter((point) => point.is_steeves);
  const marketPoints = scatterData.filter((point) => !point.is_steeves);

  const selectedRangeLabel = `${location === "all" ? "All locations" : location} | Certs >= ${minCerts} | Cloud >= ${minCloud}%`;

  if (loading && competitors.length === 0 && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-steeves-muted">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Market Position</h1>
        <p className="vz-subtitle mt-1">
          Steeves vs. {summary?.total_dataset_companies || filterOptions?.total_companies || 50} Canadian Microsoft partners
        </p>
      </div>

      <div className="vz-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-steeves-navy" />
            <h2 className="text-sm font-semibold text-[#495057]">Interactive Filters</h2>
          </div>
          <p className="text-xs text-steeves-muted">{selectedRangeLabel}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <label className="text-xs font-medium text-steeves-muted">
            Location
            <select
              className="vz-input mt-1 w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {(filterOptions?.locations || []).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Min Certifications
            <select
              className="vz-input mt-1 w-full"
              value={minCerts}
              onChange={(e) => setMinCerts(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}+
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Min Cloud Focus
            <select
              className="vz-input mt-1 w-full"
              value={minCloud}
              onChange={(e) => setMinCloud(Number(e.target.value))}
            >
              {[0, 50, 60, 70, 80, 90].map((value) => (
                <option key={value} value={value}>
                  {value}%+
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Min Rate
            <select
              className="vz-input mt-1 w-full"
              value={minRate ?? ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setMinRate(value);
                if (maxRate !== null && value > maxRate) {
                  setMaxRate(value);
                }
              }}
              disabled={!rateSteps.length}
            >
              {rateSteps.map((value) => (
                <option key={value} value={value}>
                  ${value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-steeves-muted">
            Max Rate
            <select
              className="vz-input mt-1 w-full"
              value={maxRate ?? ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setMaxRate(value);
                if (minRate !== null && value < minRate) {
                  setMinRate(value);
                }
              }}
              disabled={!rateSteps.length}
            >
              {rateSteps.map((value) => (
                <option key={value} value={value}>
                  ${value}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 items-end">
            <label className="text-xs font-medium text-steeves-muted col-span-2">
              Include Steeves
              <select
                className="vz-input mt-1 w-full"
                value={includeSteeves ? "yes" : "no"}
                onChange={(e) => setIncludeSteeves(e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs font-medium text-steeves-muted">
            Top N for ranking charts
            <select
              className="ml-2 vz-input py-1.5"
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
            >
              {[8, 10, 12, 15, 20].map((value) => (
                <option key={value} value={value}>
                  Top {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="rounded-md border border-steeves-border px-3 py-1.5 text-sm font-medium text-steeves-ink hover:bg-steeves-light"
            onClick={() => {
              setLocation("all");
              setMinCerts(0);
              setMinCloud(0);
              setMinRate(filterOptions?.rate_min ?? null);
              setMaxRate(filterOptions?.rate_max ?? null);
              setTopLimit(12);
              setIncludeSteeves(true);
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load data from the backend API. {error}
        </div>
      )}

      {loading && <p className="text-xs text-steeves-muted">Updating market charts for selected filters...</p>}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            title="Companies in View"
            value={`${summary.total_companies} / ${summary.total_dataset_companies}`}
            icon={<Trophy size={20} />}
          />
          <KpiCard
            title="Avg Midpoint Rate"
            value={summary.avg_rate_mid ? `$${summary.avg_rate_mid}/hr` : "N/A"}
            icon={<Target size={20} />}
          />
          <KpiCard
            title="FastTrack Partners"
            value={summary.fasttrack_count}
            subtitle={`Gold certified: ${summary.gold_certified_count}`}
            icon={<Shield size={20} />}
          />
          <KpiCard
            title="Markets Represented"
            value={byLocation.length}
            subtitle="Distinct locations in current view"
            icon={<MapPin size={20} />}
          />
          <KpiCard
            title="Steeves Cert Rank"
            value={summary.steeves?.cert_rank ? `#${summary.steeves.cert_rank}` : "N/A"}
            subtitle={summary.steeves ? `Rate rank #${summary.steeves.rate_rank || "-"}` : "Steeves excluded by filters"}
            icon={<Trophy size={20} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Hourly Rate Comparison (Midpoint)</h2>
          <p className="text-xs text-steeves-muted mb-3">Top {topLimit} by midpoint billing rate</p>
          {rateLeaderboard.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center text-sm text-steeves-muted">No data for selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={rateLeaderboard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${toNumber(v)}`} />
                <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number | string, name: string, item: { payload?: { cert_count: number } }) => [
                    `$${toNumber(value)}/hr`,
                    "Midpoint Rate",
                  ]}
                  labelFormatter={(label, payload) => {
                    const certs = payload?.[0]?.payload?.cert_count;
                    return `${label} | Certifications: ${certs ?? 0}`;
                  }}
                />
                <Bar dataKey="mid" radius={[0, 4, 4, 0]}>
                  {rateLeaderboard.map((entry) => (
                    <Cell key={entry.name} fill={entry.isSteeves ? "#f7b84b" : "#405189"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Certification Depth</h2>
          <p className="text-xs text-steeves-muted mb-3">Top {topLimit} by total certifications and partner badges</p>
          {certLeaderboard.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center text-sm text-steeves-muted">No data for selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={certLeaderboard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 5]} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={165} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number | string) => [`${toNumber(value)} certifications`, "Certifications"]} />
                <Bar dataKey="certs" radius={[0, 4, 4, 0]}>
                  {certLeaderboard.map((entry) => (
                    <Cell key={entry.name} fill={entry.isSteeves ? "#f7b84b" : "#0ab39c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Cloud Focus vs. Billing Rate</h2>
          <p className="text-xs text-steeves-muted mb-3">Higher and further right indicates premium cloud-focused partners</p>
          {scatterData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-steeves-muted">No data for selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Cloud Focus %"
                  tick={{ fontSize: 11 }}
                  domain={[50, 100]}
                  unit="%"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Rate Midpoint"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${toNumber(v)}`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number | string, key: string) => {
                    if (key === "x") return [`${toNumber(value)}%`, "Cloud Focus"];
                    if (key === "y") return [`$${toNumber(value)}/hr`, "Rate Midpoint"];
                    return [String(value), key];
                  }}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as ScatterPoint | undefined;
                    if (!point) return "";
                    return `${point.company_name} | ${point.location} | Certs: ${point.cert_count}`;
                  }}
                />
                <Legend />
                <Scatter name="Market" data={marketPoints} fill="#3577f1" />
                <Scatter name="Steeves" data={steevesPoint} fill="#f7b84b" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Geographic Distribution</h2>
          <p className="text-xs text-steeves-muted mb-3">Company count by location for current filters</p>
          {byLocation.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-steeves-muted">No data for selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byLocation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="location" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value: number | string) => [`${toNumber(value)} companies`, "Companies"]} />
                <Bar dataKey="count" fill="#3577f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="vz-card p-5">
        <h2 className="text-sm font-semibold text-[#495057] mb-1">Employee Band Distribution</h2>
        <p className="text-xs text-steeves-muted mb-3">How many firms fall into each employee-size segment</p>
        {bySize.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-steeves-muted">No data for selected filters.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bySize}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="num_employees" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value: number | string) => [`${toNumber(value)} companies`, "Companies"]} />
              <Bar dataKey="count" fill="#0ab39c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
