"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/navItems";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-steeves-border bg-white/95 px-2 py-2 backdrop-blur-sm lg:hidden">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-[11px] font-medium",
                isActive
                  ? "bg-steeves-blue/10 text-steeves-blue"
                  : "text-steeves-muted hover:bg-steeves-light hover:text-steeves-navy"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
