export function KpiCard({ title, value, hint, tone }: { title: string; value: string; hint?: string; tone?: "positive" | "negative" }) {
  return (
    <section className="card">
      <h2 className="text-sm text-muted">{title}</h2>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""}`}>{value}</p>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </section>
  );
}
