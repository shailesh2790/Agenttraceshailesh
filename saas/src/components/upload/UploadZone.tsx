"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "uploading" | "success" | "error";

export function UploadZone() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState]   = useState<State>("idle");
  const [error, setError]   = useState("");
  const [traceId, setTraceId] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setState("uploading");
    setError("");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/traces", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Upload failed (${res.status})`);
      setState("error");
      return;
    }

    const data = await res.json();
    setTraceId(data.id);
    setState("success");
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (!file.name.endsWith(".atrace") && file.type !== "application/json") {
      setError("Please upload a .atrace or .json file.");
      setState("error");
      return;
    }
    upload(file);
  }

  return (
    <div className="max-w-xl">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
          ${dragOver
            ? "border-gray-400 bg-gray-100"
            : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".atrace,.json"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="text-4xl mb-3 font-mono text-gray-300">↑</div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          Drop a <code className="font-mono bg-gray-100 px-1 rounded text-xs">.atrace</code> file here
        </p>
        <p className="text-xs text-gray-400">or click to browse</p>
      </div>

      {/* Status */}
      {state === "uploading" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Uploading…
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium mb-1">Upload failed</p>
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={() => setState("idle")}
            className="mt-2 text-xs text-red-600 hover:text-red-900 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {state === "success" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700 font-medium mb-2">Trace uploaded successfully</p>
          <button
            onClick={() => router.push(`/traces/${traceId}`)}
            className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
          >
            View trace →
          </button>
          <button
            onClick={() => setState("idle")}
            className="ml-3 text-sm text-green-600 hover:text-green-900"
          >
            Upload another
          </button>
        </div>
      )}

      {/* SDK tip */}
      {state === "idle" && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Or upload via API</p>
          <code className="text-xs text-gray-500 font-mono block">
            curl -X POST /api/traces \<br />
            &nbsp;&nbsp;-H &quot;Authorization: Bearer at_...&quot; \<br />
            &nbsp;&nbsp;-d @run.atrace
          </code>
          <p className="text-xs text-gray-400 mt-2">
            Generate an API key in{" "}
            <a href="/keys" className="text-gray-700 hover:underline">API Keys</a>
          </p>
        </div>
      )}
    </div>
  );
}
