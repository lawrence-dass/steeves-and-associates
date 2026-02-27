"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi, postApi } from "@/lib/api";
import { UsersRound, WandSparkles } from "lucide-react";

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

export default function AllocationPage() {
  const [inputs, setInputs] = useState<AllocationInputs>({ customers: [], resources: [], categories: [] });
  const [customerName, setCustomerName] = useState("");
  const [category, setCategory] = useState("");
  const [existingTeam, setExistingTeam] = useState<string[]>([]);
  const [topN, setTopN] = useState(5);

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
        if (active) {
          setLoadingInputs(false);
        }
      }
    }

    loadInputs();

    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => customerName.trim().length > 0 && !loadingResults, [customerName, loadingResults]);

  async function runRecommendation() {
    if (!canSubmit) return;

    setLoadingResults(true);
    try {
      const response = await postApi<Recommendation[]>("/api/allocation/recommend", {
        customer_name: customerName,
        category: category || null,
        existing_team: existingTeam,
        top_n: topN,
      });
      setResults(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run recommendations");
    } finally {
      setLoadingResults(false);
    }
  }

  function toggleTeamMember(member: string) {
    setExistingTeam((prev) =>
      prev.includes(member) ? prev.filter((item) => item !== member) : [...prev, member]
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
                  onChange={(e) => setCustomerName(e.target.value)}
                >
                  {inputs.customers.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
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
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-steeves-muted block">
                Number of Recommendations: <span className="text-steeves-ink">{topN}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="mt-2 w-full accent-steeves-blue"
                />
              </label>

              <div>
                <p className="text-xs font-medium text-steeves-muted mb-2">Existing Team (optional)</p>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-steeves-border p-2 space-y-1">
                  {inputs.resources.map((resource) => {
                    const checked = existingTeam.includes(resource);
                    return (
                      <label key={resource} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-steeves-light/60">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeamMember(resource)}
                          className="accent-steeves-blue"
                        />
                        <span className="text-sm text-steeves-ink">{resource}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={runRecommendation}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 w-full rounded-md bg-steeves-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-steeves-navy disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <WandSparkles size={15} />
                {loadingResults ? "Running..." : "Generate Recommendations"}
              </button>
            </>
          )}
        </div>

        <div className="vz-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[#495057]">Top Recommendations</h2>
            <p className="text-xs text-steeves-muted">{results.length} resources ranked</p>
          </div>

          {results.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center text-sm text-steeves-muted">
              Run the model to view ranked consultant recommendations.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((row, index) => (
                <div key={row.resource} className="rounded-lg border border-steeves-border p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-steeves-ink">
                        #{index + 1} {row.resource}
                      </p>
                      <p className="text-xs text-steeves-muted mt-1">{row.rationale}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[22px] leading-none font-semibold text-steeves-navy">{row.score}</p>
                      <p className="text-[11px] text-steeves-muted mt-1">Composite</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-steeves-border p-2">
                      <p className="text-steeves-muted">Experience</p>
                      <p className="text-sm font-semibold text-steeves-ink">{row.experience}</p>
                    </div>
                    <div className="rounded-md border border-steeves-border p-2">
                      <p className="text-steeves-muted">Performance</p>
                      <p className="text-sm font-semibold text-steeves-ink">{row.performance}</p>
                    </div>
                    <div className="rounded-md border border-steeves-border p-2">
                      <p className="text-steeves-muted">Availability</p>
                      <p className="text-sm font-semibold text-steeves-ink">{row.availability}</p>
                    </div>
                    <div className="rounded-md border border-steeves-border p-2">
                      <p className="text-steeves-muted">Collaboration</p>
                      <p className="text-sm font-semibold text-steeves-ink">{row.collaboration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
