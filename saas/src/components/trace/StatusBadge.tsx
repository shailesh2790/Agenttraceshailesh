const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  completed: { label: "✓ completed", classes: "bg-green-100 text-green-700" },
  failed:    { label: "✗ failed",    classes: "bg-red-100 text-red-700"     },
  running:   { label: "⋯ running",   classes: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "⊘ cancelled", classes: "bg-gray-100 text-gray-600"   },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, classes: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
