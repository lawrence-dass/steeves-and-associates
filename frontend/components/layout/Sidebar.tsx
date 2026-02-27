"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/navItems";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] flex-col bg-steeves-navy text-white lg:flex">
      <div className="px-7 py-6 border-b border-white/10">
        <h1 className="text-[30px] font-extrabold tracking-tight leading-none">S&A</h1>
        <p className="mt-1 text-[18px] font-semibold tracking-wide">Steeves &amp; Associates</p>
        <p className="text-xs text-white/55 mt-1">Analytics Dashboard</p>
      </div>

      <div className="px-6 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
        Menu
      </div>
      <nav className="flex-1 py-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-md px-4 py-2.5 text-[15px] transition-colors",
                isActive
                  ? "bg-white/12 text-white font-medium"
                  : "text-white/65 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40">
        <p>ALY6080 Capstone</p>
        <p>Group 2</p>
      </div>
    </aside>
  );
}
