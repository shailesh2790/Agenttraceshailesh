"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◎" },
  { href: "/traces",    label: "Traces",    icon: "≋" },
  { href: "/upload",    label: "Upload",    icon: "↑" },
  { href: "/keys",      label: "API Keys",  icon: "⬡" },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="font-mono font-semibold text-gray-900 text-sm tracking-tight">
          AgentTrace
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <span className="font-mono text-base w-4 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
