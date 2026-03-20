"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

export interface LocationGroup {
  location: string;
  count: number;
  companies?: string[];
}

interface TooltipState {
  x: number;
  y: number;
  city: string;
  count: number;
  companies?: string[];
}

// Approximate lat/lon centres for Canadian cities in the dataset
const CITY_COORDS: Record<string, [number, number]> = {
  Toronto: [-79.3832, 43.6532],
  Vancouver: [-123.1207, 49.2827],
  Calgary: [-114.0719, 51.0447],
  Edmonton: [-113.4909, 53.5461],
  Montreal: [-73.5673, 45.5017],
  Ottawa: [-75.6972, 45.4215],
  Winnipeg: [-97.1384, 49.8951],
  Victoria: [-123.3656, 48.4284],
  Burnaby: [-122.9805, 49.2488],
  Mississauga: [-79.6441, 43.5890],
  Oakville: [-79.6877, 43.4675],
  "Richmond Hill": [-79.4371, 43.8828],
  Gatineau: [-75.7016, 45.4765],
  Fredericton: [-66.6431, 45.9636],
  Regina: [-104.6189, 50.4452],
  Woodstock: [-80.7573, 43.1307],
  Halifax: [-63.5752, 44.6488],
};

const GEO_URL = "/canada-provinces.json";

interface Props {
  locations: LocationGroup[];
  highlightCity?: string;
}

export default function CanadaMap({ locations, highlightCity = "Burnaby" }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const maxCount = Math.max(1, ...locations.map((l) => l.count));

  const bubbles = locations
    .map((loc) => {
      const coords = CITY_COORDS[loc.location];
      if (!coords) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`CanadaMap: no coordinates for city "${loc.location}"`);
        }
        return null;
      }
      return { ...loc, coords };
    })
    .filter(Boolean) as (LocationGroup & { coords: [number, number] })[];

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoAzimuthalEqualArea"
        projectionConfig={{ rotate: [96, -60, 0], scale: 700 }}
        style={{ width: "100%", height: "320px" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e9ebec"
                stroke="#c8cacc"
                strokeWidth={0.5}
                style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
              />
            ))
          }
        </Geographies>

        {bubbles.map((loc) => {
          const radius = 6 + (loc.count / maxCount) * 18;
          const isHQ = loc.location === highlightCity;
          return (
            <Marker
              key={loc.location}
              coordinates={loc.coords}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGElement)
                  .closest("svg")
                  ?.getBoundingClientRect();
                const containerRect = (e.currentTarget as SVGElement)
                  .closest(".relative")
                  ?.getBoundingClientRect();
                if (rect && containerRect) {
                  setTooltip({
                    x: e.clientX - containerRect.left + 12,
                    y: e.clientY - containerRect.top - 10,
                    city: loc.location,
                    count: loc.count,
                    companies: loc.companies,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle
                r={radius}
                fill={isHQ ? "#f7b84b" : "#3577f1"}
                fillOpacity={isHQ ? 1 : 0.7}
                stroke={isHQ ? "#e0a030" : "#2060d0"}
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />
              {isHQ && (
                <text
                  textAnchor="middle"
                  y={-radius - 4}
                  style={{ fontSize: 9, fill: "#405189", fontWeight: 600, pointerEvents: "none" }}
                >
                  HQ
                </text>
              )}
            </Marker>
          );
        })}
      </ComposableMap>

      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-white border border-steeves-border
                     rounded-lg shadow-panel px-3 py-2 text-xs text-steeves-ink"
          style={{ left: tooltip.x, top: tooltip.y, maxWidth: 200 }}
        >
          <p className="font-semibold">{tooltip.city}</p>
          <p className="text-steeves-muted">
            {tooltip.count} {tooltip.count === 1 ? "company" : "companies"}
          </p>
          {tooltip.companies && tooltip.companies.length > 0 && (
            <p className="mt-1 text-steeves-muted truncate">
              {tooltip.companies.slice(0, 3).join(", ")}
              {tooltip.companies.length > 3 && ` +${tooltip.companies.length - 3} more`}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-2 text-[11px] text-steeves-muted justify-end">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-steeves-gold border border-[#e0a030]" />
          Steeves HQ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-steeves-blue opacity-70" />
          Competitors
        </span>
      </div>
    </div>
  );
}
