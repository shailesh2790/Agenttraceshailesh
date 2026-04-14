"use client";

import { useState } from "react";
import type { AgentTrace } from "@/lib/types";
import { DropZone } from "@/components/DropZone";
import { TraceViewer } from "@/components/TraceViewer";

export default function Home() {
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  return trace ? (
    <TraceViewer trace={trace} onReset={() => setTrace(null)} />
  ) : (
    <DropZone onLoad={setTrace} />
  );
}
