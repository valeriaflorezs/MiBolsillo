export function ProgressBar({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full ${danger ? "bg-negative" : "bg-brand"}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
