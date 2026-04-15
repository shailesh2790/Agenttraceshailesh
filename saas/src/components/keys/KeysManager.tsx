"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

interface KeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface Props { initialKeys: KeyRow[] }

export function KeysManager({ initialKeys }: Props) {
  const [keys, setKeys]       = useState(initialKeys);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey]   = useState<string | null>(null);
  const [error, setError]     = useState("");

  async function createKey() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create key");
      setCreating(false);
      return;
    }
    setKeys((prev) => [
      { id: data.id, name: data.name, keyPrefix: data.keyPrefix, createdAt: new Date(data.createdAt), lastUsedAt: null },
      ...prev,
    ]);
    setNewKey(data.key);
    setNewName("");
    setCreating(false);
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div>
      {/* Create key form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create new key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Key name (e.g. production, my-agent)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Newly created key reveal */}
      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 font-mono text-xs bg-white border border-amber-200 px-3 py-2.5 rounded-lg text-gray-800 select-all overflow-auto">
              {newKey}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); }}
              className="text-xs bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2.5 rounded-lg hover:bg-amber-200 transition-colors shrink-0"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-amber-600 hover:text-amber-900"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
          <p className="text-sm text-gray-400">No API keys yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 mb-0.5">{k.name}</div>
                  <div className="font-mono text-xs text-gray-400">
                    at_{k.keyPrefix}••••••••••••••••••••••••••••••••••••••••••••••••
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500">Created {formatDate(k.createdAt)}</div>
                  {k.lastUsedAt ? (
                    <div className="text-xs text-gray-400">Last used {formatDate(k.lastUsedAt)}</div>
                  ) : (
                    <div className="text-xs text-gray-300">Never used</div>
                  )}
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  className="text-xs text-red-400 hover:text-red-700 transition-colors shrink-0"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
