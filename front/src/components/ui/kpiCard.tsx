/** Carte KPI minimaliste */
export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
