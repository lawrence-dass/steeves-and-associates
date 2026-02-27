"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

type RiskFilter = "all" | "Healthy" | "Watch" | "At-Risk";

interface ClientHealthRecord {
  customer_name: string;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  trend_score: number;
  health_score: number;
  risk_level: "Healthy" | "Watch" | "At-Risk";
  total_revenue: number;
  last_activity: string;
}

interface ClientHealthSummary {
  total_clients: number;
  healthy_count: number;
  watch_count: number;
  at_risk_count: number;
  avg_health_score: number;
}

const RISK_STYLES: Record<Exclude<RiskFilter, "all">, string> = {
  Healthy: "bg-steeves-teal/10 text-steeves-teal border-steeves-teal/25",
  Watch: "bg-steeves-gold/15 text-[#8a6200] border-steeves-gold/35",
  "At-Risk": "bg-steeves-danger/10 text-steeves-danger border-steeves-danger/25",
};

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function ClientHealthPage() {
  const [rows, setRows] = useState<ClientHealthRecord[]>([]);
  const [summary, setSummary] = useState<ClientHealthSummary | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [selectedClient, setSelectedClient] = useState<ClientHealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const [healthRows, healthSummary] = await Promise.all([
          fetchApi<ClientHealthRecord[]>("/api/client-health"),
          fetchApi<ClientHealthSummary>("/api/client-health/summary"),
        ]);

        if (!active) return;

        setRows(healthRows);
        setSummary(healthSummary);
        setSelectedClient(healthRows[0] || null);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load client health data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const scoped =
      riskFilter === "all" ? rows : rows.filter((row) => row.risk_level === riskFilter);
    return [...scoped].sort((a, b) => a.health_score - b.health_score);
  }, [rows, riskFilter]);

  const selectedRadarData = useMemo(() => {
    if (!selectedClient) return [];
    return [
      { metric: "Recency", score: selectedClient.recency_score },
      { metric: "Frequency", score: selectedClient.frequency_score },
      { metric: "Monetary", score: selectedClient.monetary_score },
      { metric: "Trend", score: selectedClient.trend_score },
    ];
  }, [selectedClient]);

  const summaryCards = [
    {
      key: "Healthy" as const,
      label: "Healthy",
      value: summary?.healthy_count || 0,
      icon: ShieldCheck,
      tone: "text-steeves-teal",
    },
    {
      key: "Watch" as const,
      label: "Watch",
      value: summary?.watch_count || 0,
      icon: AlertTriangle,
      tone: "text-steeves-gold",
    },
    {
      key: "At-Risk" as const,
      label: "At-Risk",
      value: summary?.at_risk_count || 0,
      icon: ShieldAlert,
      tone: "text-steeves-danger",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Client Health</h1>
        <p className="vz-subtitle mt-1">
          Early-warning risk scoring across recency, frequency, monetary trend, and momentum
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load client health data. {error}
        </div>
      )}

      {loading && <p className="text-xs text-steeves-muted">Loading client health analytics...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setRiskFilter("all")}
          className={`vz-card p-4 text-left ${riskFilter === "all" ? "ring-2 ring-steeves-blue/40" : ""}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steeves-muted">Total Clients</p>
          <p className="mt-2 text-3xl font-semibold text-steeves-ink">{summary?.total_clients || rows.length}</p>
          <p className="mt-1 text-xs text-steeves-muted">Avg score {summary?.avg_health_score ?? "-"}</p>
        </button>

        {summaryCards.map((card) => {
          const Icon = card.icon;
          const active = riskFilter === card.key;
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => setRiskFilter(card.key)}
              className={`vz-card p-4 text-left ${active ? "ring-2 ring-steeves-blue/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-steeves-muted">{card.label}</p>
                <Icon className={card.tone} size={18} />
              </div>
              <p className="mt-2 text-3xl font-semibold text-steeves-ink">{card.value}</p>
              <p className="mt-1 text-xs text-steeves-muted">Click to filter table</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
        <div className="vz-card p-5 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[#495057]">Client Health Table</h2>
            <p className="text-xs text-steeves-muted">
              Showing {filteredRows.length} clients{riskFilter !== "all" ? ` (${riskFilter})` : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-steeves-border text-xs text-steeves-muted uppercase tracking-wide">
                  <th className="px-2 py-2 text-left">Client</th>
                  <th className="px-2 py-2 text-left">Health</th>
                  <th className="px-2 py-2 text-left">Risk</th>
                  <th className="px-2 py-2 text-left">Last Activity</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const active = selectedClient?.customer_name === row.customer_name;
                  return (
                    <tr
                      key={row.customer_name}
                      className={`border-b border-steeves-border/70 cursor-pointer hover:bg-steeves-light/60 ${
                        active ? "bg-steeves-blue/5" : ""
                      }`}
                      onClick={() => setSelectedClient(row)}
                    >
                      <td className="px-2 py-2 text-steeves-ink font-medium">{row.customer_name}</td>
                      <td className="px-2 py-2">
                        <div className="w-40">
                          <div className="flex items-center justify-between mb-1 text-xs text-steeves-muted">
                            <span>{row.health_score}</span>
                          </div>
                          <div className="h-2 rounded-full bg-steeves-border/70">
                            <div
                              className={`h-2 rounded-full ${
                                row.risk_level === "Healthy"
                                  ? "bg-steeves-teal"
                                  : row.risk_level === "Watch"
                                    ? "bg-steeves-gold"
                                    : "bg-steeves-danger"
                              }`}
                              style={{ width: `${Math.max(2, row.health_score)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${RISK_STYLES[row.risk_level]}`}
                        >
                          {row.risk_level}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-steeves-muted">{row.last_activity}</td>
                      <td className="px-2 py-2 text-right text-steeves-ink font-medium">
                        {formatCurrency(row.total_revenue)}
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td className="px-2 py-8 text-center text-steeves-muted" colSpan={5}>
                      No clients match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="vz-card p-5">
          <h2 className="text-sm font-semibold text-[#495057] mb-1">Client Detail</h2>
          <p className="text-xs text-steeves-muted mb-3">
            Select a client from the table to inspect score components
          </p>

          {selectedClient ? (
            <>
              <div className="rounded-lg border border-steeves-border bg-steeves-light/45 p-3 mb-4">
                <p className="text-sm font-semibold text-steeves-ink">{selectedClient.customer_name}</p>
                <p className="text-xs text-steeves-muted mt-1">
                  Health score {selectedClient.health_score} | {selectedClient.risk_level}
                </p>
                <p className="text-xs text-steeves-muted mt-1">
                  Last activity {selectedClient.last_activity}
                </p>
              </div>

              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={selectedRadarData}>
                    <PolarGrid stroke="#dfe3e6" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar dataKey="score" stroke="#3577f1" fill="#3577f1" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-md border border-steeves-border p-2">
                  <p className="text-[11px] text-steeves-muted">Recency</p>
                  <p className="text-sm font-semibold text-steeves-ink">{selectedClient.recency_score}</p>
                </div>
                <div className="rounded-md border border-steeves-border p-2">
                  <p className="text-[11px] text-steeves-muted">Frequency</p>
                  <p className="text-sm font-semibold text-steeves-ink">{selectedClient.frequency_score}</p>
                </div>
                <div className="rounded-md border border-steeves-border p-2">
                  <p className="text-[11px] text-steeves-muted">Monetary</p>
                  <p className="text-sm font-semibold text-steeves-ink">{selectedClient.monetary_score}</p>
                </div>
                <div className="rounded-md border border-steeves-border p-2">
                  <p className="text-[11px] text-steeves-muted">Trend</p>
                  <p className="text-sm font-semibold text-steeves-ink">{selectedClient.trend_score}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-sm text-steeves-muted">
              No client selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
