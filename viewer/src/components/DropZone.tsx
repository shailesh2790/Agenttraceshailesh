"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentTrace } from "@/lib/types";
import { EXAMPLES } from "@/lib/examples";

interface Props {
  onLoad: (trace: AgentTrace) => void;
}

export function DropZone({ onLoad }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = useCallback(
    (text: string, filename: string) => {
      try {
        const data = JSON.parse(text);
        if (!data.atrace || !data.steps) {
          setError("This doesn't look like a valid .atrace file — missing 'atrace' or 'steps' fields.");
          return;
        }
        setError(null);
        onLoad(data as AgentTrace);
      } catch {
        setError(`Could not parse ${filename} — make sure it's valid JSON.`);
      }
    },
    [onLoad]
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => parse(e.target?.result as string, file.name);
      reader.readAsText(file);
    },
    [parse]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900 tracking-tight">AgentTrace</span>
        <a
          href="https://github.com/shailesh2790/Agenttraceshailesh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          GitHub →
        </a>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-lg w-full">
          <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
            AgentTrace Viewer
          </h1>
          <p className="text-gray-500 text-center mb-10 text-sm">
            Visualise any <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">.atrace</code> file — step timeline, loop iterations, token costs, retry chains.
          </p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all
              ${dragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
              }
            `}
          >
            <div className="text-3xl mb-3">↑</div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drop your <code className="font-mono text-xs">.atrace</code> file here
            </p>
            <p className="text-xs text-gray-400">or click to browse</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".atrace,.json"
            className="hidden"
            onChange={handleChange}
          />

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Examples */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 mb-3">or try a bundled example</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => onLoad(ex.trace)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
