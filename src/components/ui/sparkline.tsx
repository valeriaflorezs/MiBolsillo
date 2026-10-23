/** Mini gráfico de tendencia (decorativo: el valor siempre se muestra en texto al lado). */
export function Sparkline({ values, className = "text-brand" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120, h = 36, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-9 w-full ${className}`} aria-hidden preserveAspectRatio="none">
      <path d={area} fill="currentColor" opacity=".12" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="currentColor" />
    </svg>
  );
}
