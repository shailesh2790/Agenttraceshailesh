import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: string;
  color?: "default" | "green" | "blue" | "red";
}

const COLOR_MAP = {
  default: "bg-gray-100 text-gray-700",
  green:   "bg-green-100 text-green-700",
  blue:    "bg-blue-100 text-blue-700",
  red:     "bg-red-100 text-red-700",
};

export function StatCard({ label, value, icon, color = "default" }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono mb-3", COLOR_MAP[color])}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
