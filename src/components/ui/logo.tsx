/* eslint-disable @next/next/no-img-element */
const ASSETS = {
  full: { onDark: { src: "/brand/logo-on-dark.png", w: 1200, h: 218 }, onLight: { src: "/brand/logo-on-light.png", w: 1200, h: 220 } },
  mark: { onDark: { src: "/brand/mark-on-dark.png", w: 387, h: 266 }, onLight: { src: "/brand/mark-on-light.png", w: 406, h: 275 } },
} as const;

type Props = {
  variant?: "full" | "mark";
  /** onDark = para fondos oscuros (navy); onLight = para fondos claros; auto = según el tema de la app. */
  tone?: "auto" | "onDark" | "onLight";
  height?: number;
  className?: string;
};

/** Logotipo de MiBolsillo (PNG con fondo transparente en /public/brand). Con `tone="auto"` cambia solo entre tema claro y oscuro. */
export function Logo({ variant = "full", tone = "auto", height = 28, className = "" }: Props) {
  const img = (t: "onDark" | "onLight", extra: string, alt: string) => {
    const a = ASSETS[variant][t];
    return <img src={a.src} alt={alt} width={Math.round((height * a.w) / a.h)} height={height} className={`${extra} ${className}`} style={{ height, width: "auto", maxWidth: "100%", objectFit: "contain", alignSelf: "flex-start" }} />;
  };
  if (tone === "onDark") return img("onDark", "", "MiBolsillo");
  if (tone === "onLight") return img("onLight", "", "MiBolsillo");
  return (
    <>
      {img("onLight", "dark:hidden", "MiBolsillo")}
      {img("onDark", "hidden dark:block", "")}
    </>
  );
}
