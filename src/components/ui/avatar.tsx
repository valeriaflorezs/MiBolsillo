const COLORS = ["bg-brand on-brand", "bg-accent text-[#0b1b3a]", "bg-panel2 text-white", "bg-[#a9cdf5] text-[#0b1b3a]", "bg-[#4f8fe0] text-white"];

export function Avatar({ name, image, size = 36 }: { name?: string | null; image?: string | null; size?: number }) {
  const label = (name ?? "?").trim();
  const initials = label.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const color = COLORS[[...label].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
  const box = { width: size, height: size };
  const initialsEl = <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${color}`} style={{ ...box, fontSize: size * 0.38 }}>{initials}</span>;
  if (!image) return initialsEl;
  // La foto se superpone a las iniciales: si Google no la entrega (bloqueo, expiró), se ven las iniciales.
  return (
    <span className="relative inline-block shrink-0 rounded-full" style={box}>
      {initialsEl}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="absolute inset-0 rounded-full object-cover" style={box} />
    </span>
  );
}
