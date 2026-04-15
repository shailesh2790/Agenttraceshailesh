"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

interface Props {
  status?: string;
  agent?: string;
}

const STATUSES = ["", "completed", "failed", "running", "cancelled"];

export function TraceFilters({ status, agent }: Props) {
  const router  = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && status) params.set("status", status);
    if (key !== "agent"  && agent)  params.set("agent",  agent);
    if (value) params.set(key, value);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status filter */}
      <select
        value={status ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        <option value="">All statuses</option>
        {STATUSES.filter(Boolean).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Agent filter */}
      <input
        type="text"
        placeholder="Filter by agent name…"
        defaultValue={agent ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("agent", (e.target as HTMLInputElement).value);
        }}
        onBlur={(e) => update("agent", e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[200px]"
      />

      {/* Clear */}
      {(status || agent) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
