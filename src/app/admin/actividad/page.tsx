import Link from "next/link";
import { resolveRange, fmtDateTime } from "@/lib/admin-range";
import { describeAgent } from "@/lib/audit";
import { activityOverview, KIND_LABEL, type ActivitySP } from "@/modules/admin/queries";

export const metadata = { title: "Administración · Actividad" };

const CHIPS = [{ k: "hoy", l: "Hoy" }, { k: "7d", l: "Últimos 7 días" }, { k: "mes", l: "Este mes" }, { k: "todo", l: "Todo" }];

export default async function Activity({ searchParams }: { searchParams: Promise<ActivitySP> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const o = await activityOverview(sp);
  const keep = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };
  const csv = `/admin/actividad/csv?${keep({ pagina: undefined })}`;
  const cards = [
    { t: "Acciones registradas", v: o.totals.total, h: range.desde || range.hasta ? `${range.desde ?? "…"} a ${range.hasta ?? "…"}` : "Todo el historial" },
    { t: "Usuarios con actividad", v: o.activeUsers, h: `de ${o.totalUsers} usuarios` },
    { t: "Ingresos y salidas", v: o.totals.access, h: "incluye intentos fallidos" },
    { t: "Cambios", v: o.totals.changes, h: "altas, ediciones, borrados y administración" },
    { t: "Análisis con IA", v: o.totals.ai, h: "solicitudes y resultados" },
    { t: "Fallidos", v: o.totals.failed, h: "ingresos rechazados, accesos negados y errores", bad: o.totals.failed > 0 },
  ];

  return (
    <>
      <form className="card space-y-4" role="search" aria-label="Filtrar actividad">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <Link key={c.k} href={`/admin/actividad?${keep({ rango: c.k, desde: undefined, hasta: undefined, pagina: undefined })}`} aria-current={range.key === c.k ? "true" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${range.key === c.k ? "border-brand bg-brand/15 text-brand-text" : "border-line hover:bg-canvas"}`}>{c.l}</Link>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><label className="label" htmlFor="desde">Desde</label><input id="desde" type="date" name="desde" defaultValue={range.desde} className="input" /></div>
          <div><label className="label" htmlFor="hasta">Hasta</label><input id="hasta" type="date" name="hasta" defaultValue={range.hasta} className="input" /></div>
          <div><label className="label" htmlFor="empresa">Empresa</label><select id="empresa" name="empresa" defaultValue={sp.empresa ?? ""} className="input"><option value="">Todas</option>{o.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div><label className="label" htmlFor="usuario">Usuario</label><select id="usuario" name="usuario" defaultValue={sp.usuario ?? ""} className="input"><option value="">Todos</option>{o.users.map((u) => <option key={u.id} value={u.id}>{u.username ?? u.email}</option>)}</select></div>
          <div><label className="label" htmlFor="tipo">Tipo de acción</label><select id="tipo" name="tipo" defaultValue={sp.tipo ?? ""} className="input"><option value="">Todas</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="sm:col-span-2 lg:col-span-2"><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} placeholder="Texto, usuario, IP…" className="input" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fallo" value="1" defaultChecked={sp.fallo === "1"} className="size-4" />Solo lo que falló (ingresos rechazados, accesos negados, errores)</label>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary">Consultar</button><a href={csv} className="btn btn-ghost">Descargar CSV</a></div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((c) => (
          <section key={c.t} className="card !p-4"><h2 className="text-sm text-muted">{c.t}</h2><p className={`mt-2 text-3xl font-semibold ${c.bad ? "text-negative" : ""}`}>{c.v}</p><p className="mt-1 text-xs text-muted">{c.h}</p></section>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Por usuario</h2>
        <div className="card overflow-x-auto !p-1">
          <table className="w-full">
            <thead><tr><th className="th">USUARIO</th><th className="th">EMPRESA</th><th className="th text-right">INGRESOS</th><th className="th text-right">CONSULTAS</th><th className="th text-right">CAMBIOS</th><th className="th text-right">IA</th><th className="th text-right">ADMIN.</th><th className="th text-right">FALLIDOS</th><th className="th">ÚLTIMA ACTIVIDAD</th></tr></thead>
            <tbody className="divide-y divide-line">
              {o.perUser.map((r) => (
                <tr key={r.key}>
                  <td className="td"><span className="font-semibold text-brand-text">{r.name ?? ""}</span> {r.label}</td>
                  <td className="td">{r.empresas || "—"}</td>
                  <td className="td text-right">{r.access}</td><td className="td text-right">{r.queries}</td><td className="td text-right">{r.changes}</td><td className="td text-right">{r.ai}</td><td className="td text-right">{r.admin}</td>
                  <td className={`td text-right ${r.failed ? "font-medium text-negative" : ""}`}>{r.failed}</td>
                  <td className="td whitespace-nowrap">{r.last ? fmtDateTime(r.last) : "—"}</td>
                </tr>
              ))}
              {o.perUser.length === 0 && <tr><td className="td text-muted" colSpan={9}>Sin actividad en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Registro</h2>
        <div className="card overflow-x-auto !p-1">
          <table className="w-full">
            <thead><tr><th className="th">FECHA</th><th className="th">USUARIO</th><th className="th">EMPRESA</th><th className="th">TIPO</th><th className="th">QUÉ HIZO</th><th className="th">DESDE</th></tr></thead>
            <tbody className="divide-y divide-line">
              {o.logs.map((l) => (
                <tr key={l.id}>
                  <td className="td whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td className="td">{l.username ?? "—"}</td>
                  <td className="td">{(l.workspaceId && o.names.get(l.workspaceId)) || "—"}</td>
                  <td className="td"><span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${l.ok ? "border-line" : "border-negative/50 text-negative"}`}>{KIND_LABEL[l.kind]}</span></td>
                  <td className="td"><p className={l.ok ? "" : "text-negative"}>{l.summary}</p>{l.detail && <p className="text-xs text-muted">{l.detail}</p>}</td>
                  <td className="td"><p className="text-sm">{l.ip ?? "—"}</p><p className="text-xs text-muted">{describeAgent(l.userAgent)}</p></td>
                </tr>
              ))}
              {o.logs.length === 0 && <tr><td className="td text-muted" colSpan={6}>No hay registros con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        {o.pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            {o.page > 1 ? <Link className="btn btn-ghost" href={`/admin/actividad?${keep({ pagina: String(o.page - 1) })}`}>‹ Más recientes</Link> : <span />}
            <span className="text-muted">Página {o.page} de {o.pages}</span>
            {o.page < o.pages ? <Link className="btn btn-ghost" href={`/admin/actividad?${keep({ pagina: String(o.page + 1) })}`}>Más antiguos ›</Link> : <span />}
          </div>
        )}
      </section>
    </>
  );
}
