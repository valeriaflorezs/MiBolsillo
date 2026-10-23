const TONES = {
  neutral: "bg-canvas/70 text-muted",
  brand: "bg-brand/15 text-brand-text",
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/15 text-negative",
  accent: "bg-accent text-[#0b1b3a]",
  onDark: "bg-white/10 text-white/80",
} as const;

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}
