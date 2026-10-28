"use client";

import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

export type FilterItem = { id: string; label: string };
type Props = { workspaceId: string; groups: { title: string; items: FilterItem[] }[]; excluded: string[]; base: Record<string, string>; hasParam: boolean };

const key = (w: string) => `mb:stats-excluded:${w}`;
const read = (k: string): string[] | null => { try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : null; } catch { return null; } };
const write = (k: string, v: string[] | null) => { try { if (v?.length) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch { /* sin almacenamiento: el filtro sigue funcionando por la URL */ } };

/** Selector de categorías para los resúmenes: lo marcado se incluye; lo desmarcado queda fuera de todas las cifras. */
export function CategoryFilter({ workspaceId, groups, excluded, base, hasParam }: Props) {
  const router = useRouter();
  const all = groups.flatMap((g) => g.items.map((i) => i.id));
  const [off, setOff] = useState<Set<string>>(new Set(excluded));
  // ¿Hay una selección recordada? (en el servidor no se sabe: null evita diferencias al hidratar)
  const hasSaved = useSyncExternalStore(() => () => {}, () => read(key(workspaceId)) !== null, () => false);
  const [rememberChoice, setRemember] = useState<boolean | null>(null);
  const remember = rememberChoice ?? hasSaved;
  const [open, setOpen] = useState(excluded.length > 0);

  const go = (ids: string[]) => {
    const p = new URLSearchParams(base);
    if (ids.length) p.set("x", ids.join(","));
    router.push(`?${p.toString()}`);
  };

  // Si hay una selección recordada y la URL no trae filtro, se aplica.
  useEffect(() => {
    if (hasParam) return;
    const saved = read(key(workspaceId));
    if (saved?.length) go(saved.filter((id) => all.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => setOff((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const apply = () => { const ids = [...off]; write(key(workspaceId), remember ? ids : null); go(ids); };
  const clear = () => { setOff(new Set()); write(key(workspaceId), null); setRemember(false); go([]); };
  const included = all.length - off.size;

  return (
    <section className="card space-y-3" aria-label="Filtro de categorías y cuentas">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 font-medium"><Filter size={16} aria-hidden />Categorías y cuentas</span>
        <span className="text-sm text-muted">{excluded.length ? `${excluded.length} fuera del resumen` : "Todas incluidas"} · {open ? "Ocultar" : "Elegir"}</span>
      </button>
      {open && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Marca las categorías y cuentas que quieres ver; las que desmarques no cuentan en ninguna cifra ni gráfica.</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" className="btn btn-ghost" onClick={() => setOff(new Set())}>Todas</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOff(new Set(all))}>Ninguna</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOff(new Set(all.filter((i) => !off.has(i))))}>Invertir</button>
          </div>
          {groups.filter((g) => g.items.length).map((g) => (
            <div key={g.title}>
              <p className="label">{g.title}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((i) => {
                  const on = !off.has(i.id);
                  return (
                    <button key={i.id} type="button" aria-pressed={on} onClick={() => toggle(i.id)}
                      className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${on ? "border-transparent bg-panel text-white shadow-glow" : "border-line bg-surface text-muted line-through"}`}>{i.label}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Recordar esta selección en este navegador</label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={apply}>Aplicar ({included} de {all.length})</button>
            {(excluded.length > 0 || off.size > 0) && <button type="button" className="btn btn-ghost" onClick={clear}>Quitar filtro</button>}
          </div>
        </div>
      )}
    </section>
  );
}
