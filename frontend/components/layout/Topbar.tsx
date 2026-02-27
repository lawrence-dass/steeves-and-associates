"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Grid2x2,
  Menu,
  Moon,
  Search,
  ShoppingBag,
} from "lucide-react";

const titles: Record<string, string> = {
  "/": "Overview",
  "/market": "Market Position",
  "/client-health": "Client Health",
  "/allocation": "Resource Allocation",
  "/chat": "AI Chat",
  "/powerbi": "Power BI",
};

export default function Topbar() {
  const pathname = usePathname();

  const pageTitle = useMemo(() => titles[pathname] || "Dashboard", [pathname]);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-steeves-border bg-white/95 backdrop-blur-sm lg:left-[250px]">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="vz-topbar-icon lg:pointer-events-none lg:opacity-0"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>

          <div className="relative hidden md:block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steeves-muted"
            />
            <input
              className="vz-input w-[250px] pl-9"
              placeholder="Search..."
              aria-label="Search"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button className="vz-topbar-icon hidden sm:flex" type="button" aria-label="Apps">
            <Grid2x2 size={16} />
          </button>
          <button className="vz-topbar-icon hidden sm:flex" type="button" aria-label="Store">
            <ShoppingBag size={16} />
          </button>
          <button className="vz-topbar-icon" type="button" aria-label="Theme">
            <Moon size={16} />
          </button>
          <button className="vz-topbar-icon relative" type="button" aria-label="Notifications">
            <Bell size={16} />
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-steeves-danger" />
          </button>

          <div className="ml-1 hidden items-center gap-2 rounded-md px-2 py-1.5 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-steeves-light text-steeves-navy font-semibold">
              SA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[#495057]">Steeves Team</p>
              <p className="text-[11px] text-steeves-muted">{pageTitle}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
