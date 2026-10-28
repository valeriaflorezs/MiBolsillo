import Link from "next/link";
import { fmtDateTime, resolveRange } from "@/lib/admin-range";
import { aiOverview, type AiSP } from "@/modules/admin/queries";

export const metadata = { title: "Administración · Consumo de IA" };

const CHIPS = [{ k: "hoy", l: "Hoy" }, { k: "7d", l: "Últimos 7 días" }, { k: "mes", l: "Este mes" }, { k: "todo", l: "Todo" }];
const n = (v: number) => v.toLocaleString("es-CO");

export default async function AiUse({ searchParams }: { searchParams: Promise<AiSP> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const o = await aiOverview(sp);
  const keep = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };
  const t = o.totals;
  const cards = [
    { t: "Solicitudes", v: n(t.ok + t.failed), h: "lecturas de comprobantes" },
    { t: "Exitosas", v: n(t.ok), h: "con datos extraídos" },
    { t: "Fallidas", v: n(t.failed), h: "sin resultado", bad: t.failed > 0 },
    { t: "Tokens de entrada", v: n(t.input), h: "lo que se envía al modelo" },
    { t: "Tokens de salida", v: n(t.output), h: "lo que responde el modelo" },
  ];
  const table = (title: string, rows: typeof o.perWorkspace, head: string) => (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="card overflow-x-auto !p-1">
        <table className="w-full">
          <thead><tr><th className="th">{head}</th><th className="th text-right">EXITOSAS</th><th className="th text-right">FALLIDAS</th><th className="th text-right">TOKENS ENTRADA</th><th className="th text-right">TOKENS SALIDA</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => <tr key={r.key}><td className="td font-medium">{r.label}</td><td className="td text-right">{n(r.ok)}</td><td className={`td text-right ${r.failed ? "text-negative" : ""}`}>{n(r.failed)}</td><td className="td text-right">{n(r.input)}</td><td className="td text-right">{n(r.output)}</td></tr>)}
            {rows.length === 0 && <tr><td className="td text-muted" colSpan={5}>Sin consumo en este periodo.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <form className="card space-y-4" role="search" aria-label="Filtrar consumo de IA">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <Link key={c.k} href={`/admin/ia?${keep({ rango: c.k, desde: undefined, hasta: undefined })}`} aria-current={range.key === c.k ? "true" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${range.key === c.k ? "border-brand bg-brand/15 text-brand-text" : "border-line hover:bg-canvas"}`}>{c.l}</Link>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label" htmlFor="desde">Desde</label><input id="desde" type="date" name="desde" defaultValue={range.desde} className="input" /></div>
          <div><label className="label" htmlFor="hasta">Hasta</label><input id="hasta" type="date" name="hasta" defaultValue={range.hasta} className="input" /></div>
          <div><label className="label" htmlFor="empresa">Empresa</label><select id="empresa" name="empresa" defaultValue={sp.empresa ?? ""} className="input"><option value="">Todas</option>{o.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div><label className="label" htmlFor="usuario">Usuario</label><select id="usuario" name="usuario" defaultValue={sp.usuario ?? ""} className="input"><option value="">Todos</option>{o.users.map((u) => <option key={u.id} value={u.id}>{u.username ?? u.email}</option>)}</select></div>
        </div>
        <button className="btn btn-primary">Consultar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => <section key={c.t} className="card !p-4"><h2 className="text-sm text-muted">{c.t}</h2><p className={`mt-2 text-3xl font-semibold ${c.bad ? "text-negative" : ""}`}>{c.v}</p><p className="mt-1 text-xs text-muted">{c.h}</p></section>)}
      </div>
      <p className="text-sm text-muted">El consumo se registra desde que se activó este panel; las lecturas anteriores no aparecen. Los tokens son los que informa el proveedor de IA en cada respuesta.</p>

      {table("Por empresa", o.perWorkspace, "EMPRESA")}
      {table("Por usuario", o.perUser, "USUARIO")}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Últimas solicitudes</h2>
        <div className="card overflow-x-auto !p-1">
          <table className="w-full">
            <thead><tr><th className="th">FECHA</th><th className="th">USUARIO</th><th className="th">EMPRESA</th><th className="th">MODELO</th><th className="th text-right">ENTRADA</th><th className="th text-right">SALIDA</th><th className="th">RESULTADO</th></tr></thead>
            <tbody className="divide-y divide-line">
              {o.recent.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td className="td">{(r.userId && o.userName.get(r.userId)) || "—"}</td>
                  <td className="td">{(r.workspaceId && o.wsName.get(r.workspaceId)) || "—"}</td>
                  <td className="td text-sm">{r.model ?? r.provider}</td>
                  <td className="td text-right">{n(r.inputTokens)}</td><td className="td text-right">{n(r.outputTokens)}</td>
                  <td className={`td ${r.ok ? "" : "text-negative"}`}>{r.ok ? "Exitosa" : `Falló${r.error ? ` · ${r.error}` : ""}`}</td>
                </tr>
              ))}
              {o.recent.length === 0 && <tr><td className="td text-muted" colSpan={7}>Aún no hay solicitudes registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
