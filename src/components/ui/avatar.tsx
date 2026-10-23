const COLORS = ["bg-brand text-white", "bg-accent text-[#0b1b3a]", "bg-panel2 text-white", "bg-[#a9cdf5] text-[#0b1b3a]", "bg-[#4f8fe0] text-white"];

export function Avatar({ name, image, size = 36 }: { name?: string | null; image?: string | null; size?: number }) {
  const label = (name ?? "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const color = COLORS[[...label].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
  // eslint-disable-next-line @next/next/no-img-element
  if (image) return <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${color}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>
  );
}
