import { InfoTip, type Explain } from "./info-tip";
import { Sparkline } from "./sparkline";

type Props = {
  title: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
  trend?: number[];
  icon?: React.ReactNode;
  info?: Explain;
  children?: React.ReactNode;
};

export function KpiCard({ title, value, hint, tone, trend, icon, info, children }: Props) {
  return (
    <section className="card flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm text-muted">{title}{info && <InfoTip title={title} {...info} />}</h2>
        {icon && <span aria-hidden className="grid size-8 place-items-center rounded-full inset-strong text-brand-text">{icon}</span>}
      </div>
      <div>
        <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""}`}>{value}</p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {children}
      {trend && <Sparkline values={trend} className={tone === "negative" ? "text-negative" : "text-brand"} />}
    </section>
  );
}
