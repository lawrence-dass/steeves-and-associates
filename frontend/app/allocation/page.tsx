"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi, postApi } from "@/lib/api";
import { Info, Search, UsersRound, WandSparkles, X } from "lucide-react";

interface AllocationInputs {
  customers: string[];
  resources: string[];
  categories: string[];
}

interface Recommendation {
  resource: string;
  score: number;
  experience: number;
  performance: number;
  availability: number;
  collaboration: number;
  rationale: string;
}

const SCORE_WEIGHTS = { experience: 35, performance: 30, availability: 20, collaboration: 15 };

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-steeves-border rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

export default function AllocationPage() {
  const [inputs, setInputs] = useState<AllocationInputs>({ customers: [], resources: [], categories: [] });
  const [customerName, setCustomerName] = useState("");
  const [category, setCategory] = useState("");
  const [alreadyAssigned, setAlreadyAssigned] = useState<string[]>([]);
  const [topN, setTopN] = useState(5);
  const [teamSearch, setTeamSearch] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  const [results, setResults] = useState<Recommendation[]>([]);
  const [loadingInputs, setLoadingInputs] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadInputs() {
      try {
        const response = await fetchApi<AllocationInputs>("/api/allocation/inputs");
        if (!active) return;
        setInputs(response);
        setCustomerName(response.customers[0] || "");
        setCategory(response.categories[0] || "");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load allocation inputs");
      } finally {
        if (active) setLoadingInputs(false);
      }
    }
    loadInputs();
    return () => { active = false; };
  }, []);

  const canSubmit = useMemo(() => customerName.trim().length > 0 && !loadingResults, [customerName, loadingResults]);

  const filteredResources = useMemo(
    () => inputs.resources.filter((r) => r.toLowerCase().includes(teamSearch.toLowerCase())),
    [inputs.resources, teamSearch]
  );

  // Exclude already-assigned members from recommendations
  const visibleResults = useMemo(
    () => results.filter((r) => !alreadyAssigned.includes(r.resource)),
    [results, alreadyAssigned]
  );

  async function runRecommendation() {
    if (!canSubmit) return;
    setLoadingResults(true);
    try {
      // Request extra results to account for excluded already-assigned members
      const response = await postApi<Recommendation[]>("/api/allocation/recommend", {
        customer_name: customerName,
        category: category || null,
        existing_team: alreadyAssigned,
        top_n: topN + alreadyAssigned.length,
      });
      setResults(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run recommendations");
    } finally {
      setLoadingResults(false);
    }
  }

  function toggleMember(member: string) {
    setAlreadyAssigned((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="vz-title">Resource Allocation</h1>
        <p className="vz-subtitle mt-1">
          Recommend consultant assignments based on experience, performance, availability, and collaboration fit
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to complete recommendation request. {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,1.9fr] gap-6">
        {/* ── Input panel ── */}
        <div className="vz-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UsersRound size={17} className="text-steeves-navy" />
            <h2 className="text-sm font-semibold text-[#495057]">Recommendation Inputs</h2>
          </div>

          {loadingInputs ? (
            <p className="text-sm text-steeves-muted">Loading form options...</p>
          ) : (
            <>
              <label className="text-xs font-medium text-steeves-muted block">
                Customer
                <select
                  className="vz-input mt-1 w-full"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setResults([]); }}
                >
                  {inputs.customers.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-steeves-muted block">
                Service Category
                <select
                  className="vz-input mt-1 w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {inputs.categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-steeves-muted block">
                Results to show: <span className="text-steeves-ink font-semibold">{topN}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="mt-2 w-full accent-steeves-blue"
                />
              </label>

              {/* Already-assigned section */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs font-medium text-steeves-muted">Already Assigned to Project</p>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="text-steeves-muted hover:text-steeves-navy"
                    >
                      <Info size={13} />
                    </button>
                    {showTooltip && (
                      <div className="absolute left-5 top-0 z-10 w-60 rounded-lg border border-steeves-border bg-white p-3 shadow-lg text-xs text-steeves-ink leading-relaxed">
                        Consultants you select here are <strong>already committed</strong> to this project.
                        The model will surface colleagues who have <strong>worked well with them before</strong> — boosting the Collaboration score (15% of composite).
                        Selected members are excluded from recommendations.
                      </div>
                    )}
                  </div>
                  {alreadyAssigned.length > 0 && (
                    <span className="ml-auto text-[11px] font-medium text-steeves-blue">
                      {alreadyAssigned.length} selected
                    </span>
                  )}
                </div>

                {/* Selected chips */}
                {alreadyAssigned.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {alreadyAssigned.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-full bg-steeves-blue/10 px-2 py-0.5 text-[11px] font-medium text-steeves-blue"
                      >
                        {m.split(" ")[0]}
                        <button type="button" onClick={() => toggleMember(m)} className="hover:text-steeves-navy">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search box */}
                <div className="relative mb-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steeves-muted" />
                  <input
                    type="text"
                    placeholder="Search consultants…"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="vz-input w-full pl-7 py-1.5 text-xs"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-steeves-border p-2 space-y-0.5">
                  {filteredResources.length === 0 ? (
                    <p className="text-xs text-steeves-muted px-2 py-1">No match</p>
                  ) : (
                    filteredResources.map((resource) => {
                      const checked = alreadyAssigned.includes(resource);
                      return (
                        <label
                          key={resource}
                          className={`flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-colors ${
                            checked ? "bg-steeves-blue/8 text-steeves-blue" : "hover:bg-steeves-light/60 text-steeves-ink"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(resource)}
                            className="accent-steeves-blue"
                          />
                          <span className="text-sm">{resource}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={runRecommendation}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 w-full rounded-md bg-steeves-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-steeves-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <WandSparkles size={15} />
                {loadingResults ? "Running…" : "Generate Recommendations"}
              </button>
            </>
          )}
        </div>

        {/* ── Results panel ── */}
        <div className="vz-card p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-sm font-semibold text-[#495057]">Top Recommendations</h2>
            <p className="text-xs text-steeves-muted">{visibleResults.length} consultants ranked</p>
          </div>

          {/* Score legend */}
          {visibleResults.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-steeves-muted">
              {(Object.entries(SCORE_WEIGHTS) as [string, number][]).map(([key, weight]) => (
                <span key={key} className="capitalize">{key} <span className="font-medium text-steeves-ink">{weight}%</span></span>
              ))}
            </div>
          )}

          {visibleResults.length === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-sm text-steeves-muted">
              <WandSparkles size={28} className="opacity-30" />
              <p>Select a customer and generate recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleResults.slice(0, topN).map((row, index) => (
                <div key={row.resource} className="rounded-lg border border-steeves-border p-4 bg-white hover:border-steeves-blue/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-white bg-steeves-navy rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-steeves-ink truncate">{row.resource}</p>
                      </div>
                      <p className="text-xs text-steeves-muted mt-1 ml-7">{row.rationale}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[24px] leading-none font-bold text-steeves-navy">{row.score}</p>
                      <p className="text-[11px] text-steeves-muted mt-0.5">/ 100</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ml-7">
                    {[
                      { label: "Experience", value: row.experience, color: "#405189" },
                      { label: "Performance", value: row.performance, color: "#0ab39c" },
                      { label: "Availability", value: row.availability, color: "#f7b84b" },
                      { label: "Collaboration", value: row.collaboration, color: "#3577f1" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between">
                          <span className="text-steeves-muted">{label}</span>
                          <span className="font-semibold text-steeves-ink">{value}</span>
                        </div>
                        <ScoreBar value={value} color={color} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="vz-card p-6">
        <h2 className="text-sm font-semibold text-[#495057] mb-4">How This Feature Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#405189] rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
              <p className="text-xs font-semibold text-steeves-ink">Experience <span className="font-normal text-steeves-muted">(35%)</span></p>
            </div>
            <p className="text-xs text-steeves-muted leading-relaxed pl-7">
              Measures how many hours a consultant has logged with this specific customer and in the selected service category. Higher prior engagement means a higher score.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#0ab39c] rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
              <p className="text-xs font-semibold text-steeves-ink">Performance <span className="font-normal text-steeves-muted">(30%)</span></p>
            </div>
            <p className="text-xs text-steeves-muted leading-relaxed pl-7">
              Derived from the consultant's average revenue per billable hour across all historical work. A higher billing rate relative to hours signals strong value delivery.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#f7b84b] rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
              <p className="text-xs font-semibold text-steeves-ink">Availability <span className="font-normal text-steeves-muted">(20%)</span></p>
            </div>
            <p className="text-xs text-steeves-muted leading-relaxed pl-7">
              Compares the consultant's billable hours in the last 30 days against their long-term monthly average. A lower recent load suggests more capacity to take on new work.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#3577f1] rounded-full w-5 h-5 flex items-center justify-center shrink-0">4</span>
              <p className="text-xs font-semibold text-steeves-ink">Collaboration <span className="font-normal text-steeves-muted">(15%)</span></p>
            </div>
            <p className="text-xs text-steeves-muted leading-relaxed pl-7">
              Only applies when you mark consultants as <em>Already Assigned</em>. The model counts how many past projects each candidate has shared with the assigned team — surfacing colleagues who work well together.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-steeves-border grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-steeves-muted">
          <div>
            <p className="font-semibold text-steeves-ink mb-1">Data source</p>
            <p className="leading-relaxed">All scores are computed from 17,792 time-entry records spanning 2020–2025. No manual ratings are used — everything is derived from actual billing history.</p>
          </div>
          <div>
            <p className="font-semibold text-steeves-ink mb-1">Already Assigned tip</p>
            <p className="leading-relaxed">Tick the consultants already committed to this engagement before generating results. They will be excluded from recommendations and their presence will boost candidates who have collaborated with them historically.</p>
          </div>
          <div>
            <p className="font-semibold text-steeves-ink mb-1">Composite score</p>
            <p className="leading-relaxed">The final score (0–100) is a weighted sum: Experience × 0.35 + Performance × 0.30 + Availability × 0.20 + Collaboration × 0.15. Use it as a starting point — local context and availability should always inform the final decision.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
