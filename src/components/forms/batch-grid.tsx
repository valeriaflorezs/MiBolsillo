"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { BATCH_SPECS, MAX_BATCH_ROWS, csvToData, mapSheet, parseClipboard, type BatchKind, type Mapped } from "@/lib/batch/spec";
import { norm } from "@/lib/csv";
import { batchAction, type BatchResult } from "@/modules/batch/actions";

type Props = {
  kind: BatchKind;
  workspaceId: string;
  propertyId?: string;
  properties?: { id: string; name: string }[];
  /** Etiqueta del selector (propiedad o crédito). */
  targetLabel?: string;
  /** Opciones sugeridas por columna (categorías y cuentas reales del negocio). */
  lookups?: Record<string, string[]>;
};

const blank = (n: number, cols: number) => Array.from({ length: n }, () => Array<string>(cols).fill(""));
const isEmpty = (r: string[]) => r.every((c) => !c.trim());
type Sheet = { name: string; data: unknown[][] };

export function BatchGrid({ kind, workspaceId, propertyId, properties = [], targetLabel = "Propiedad", lookups = {} }: Props) {
  const spec = BATCH_SPECS[kind];
  const cols = spec.cols;
  const [rows, setRows] = useState<string[][]>(() => blank(8, cols.length));
  const [prop, setProp] = useState(propertyId ?? properties[0]?.id ?? "");
  const [res, setRes] = useState<BatchResult | null>(null);
  const [busy, start] = useTransition();
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [fileErr, setFileErr] = useState("");
  const gridRef = useRef<HTMLTableElement>(null);

  const filled = rows.filter((r) => !isEmpty(r)).length;
  const errRows = useMemo(() => new Map((res?.errors ?? []).map((e) => [e.row, e.msg])), [res]);
  const warnRows = useMemo(() => new Set((res?.warnings ?? []).map((e) => e.row)), [res]);

  const edit = (next: string[][]) => { setRows(next); setRes(null); };
  const setCell = (r: number, c: number, v: string) => edit(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));

  /** Pega una matriz desde (r,c); si trae encabezados reconocibles, los descarta y reordena las columnas. */
  const applyPaste = (r: number, c: number, data: string[][]) => {
    const mapped = mapSheet(kind, data);
    const block = mapped ? mapped.rows : data;
    const startCol = mapped ? 0 : c;
    const next = rows.map((x) => [...x]);
    const startRow = mapped ? Math.max(0, rows.findLastIndex((x) => !isEmpty(x)) + 1) : r;
    block.forEach((line, i) => {
      const ri = startRow + i;
      if (ri >= MAX_BATCH_ROWS) return;
      while (next.length <= ri) next.push(Array<string>(cols.length).fill(""));
      line.forEach((v, j) => { if (startCol + j < cols.length) next[ri][startCol + j] = v; });
    });
    while (next.length < 8) next.push(Array<string>(cols.length).fill(""));
    edit(next);
  };

  const onPaste = (e: React.ClipboardEvent, r: number, c: number) => {
    const text = e.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(text.replace(/\n+$/, ""))) return; // un solo valor: pegado normal
    e.preventDefault();
    applyPaste(r, c, parseClipboard(text));
  };

  const focusCell = (r: number, c: number) => gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}-${c}"]`)?.focus();
  const onKey = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === "Enter") { e.preventDefault(); if (r + 1 >= rows.length && rows.length < MAX_BATCH_ROWS) edit([...rows, Array(cols.length).fill("")]); setTimeout(() => focusCell(r + 1, c)); }
    if (e.key === "ArrowDown") { e.preventDefault(); focusCell(r + 1, c); }
    if (e.key === "ArrowUp") { e.preventDefault(); focusCell(r - 1, c); }
  };

  // ---- Archivo .xlsx / .csv ----
  const onFile = async (f: File | undefined) => {
    setFileErr(""); setSheets(null); setPicked(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setFileErr("El archivo supera 5 MB.");
    try {
      let list: Sheet[];
      if (/\.csv$|\.txt$/i.test(f.name)) list = [{ name: f.name, data: csvToData(await f.text()) }];
      else if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsx } = await import("read-excel-file/universal");
        list = (await readXlsx(f)).map((s) => ({ name: s.sheet, data: s.data as unknown[][] }));
      } else return setFileErr("Usa un archivo .xlsx o .csv (los .xls antiguos: guárdalos como .xlsx).");
      const best = list.map((s) => (mapSheet(kind, s.data)?.mapped.length ?? 0) + (spec.sheetHint.test(norm(s.name).replace(/_/g, " ")) ? 0.5 : 0));
      const bi = best.indexOf(Math.max(...best));
      if (!list.length || best[bi] < 1) return setFileErr(`No encontré encabezados reconocibles (${cols.map((c) => c.label).join(", ")}).`);
      setSheets(list); setSheetIdx(bi); setPicked(null);
    } catch {
      setFileErr("No pude leer el archivo. Verifica que no esté dañado ni protegido con contraseña.");
    }
  };

  const mapped: Mapped | null = useMemo(() => (sheets ? mapSheet(kind, sheets[sheetIdx].data) : null), [sheets, sheetIdx, kind]);
  // Hojas de proyecto mezclan categorías propias (Airbnb, Apto personal…): se deja elegir cuáles traer.
  const groups = useMemo(() => {
    if (!mapped || kind !== "capex") return null;
    const known = new Set(cols[0].options!.map(norm));
    const m = new Map<string, number>();
    mapped.rows.forEach((r) => m.set(r[0], (m.get(r[0]) ?? 0) + 1));
    return [...m].some(([k]) => k && !known.has(norm(k))) ? [...m] : null;
  }, [mapped, kind, cols]);
  const selected = picked ?? (groups ? new Set(groups.some(([k]) => /airbnb/i.test(k)) ? groups.filter(([k]) => /airbnb/i.test(k)).map(([k]) => k) : groups.map(([k]) => k)) : null);
  const toLoad = mapped ? mapped.rows.filter((r) => !selected || selected.has(r[0])) : [];

  const loadMapped = () => {
    const base = rows.filter((r) => !isEmpty(r));
    const next = [...base, ...toLoad].slice(0, MAX_BATCH_ROWS);
    while (next.length < 8) next.push(Array<string>(cols.length).fill(""));
    edit(next); setSheets(null); setPicked(null);
  };

  const send = (dryRun: boolean) => start(async () => {
    const r = await batchAction({ kind, workspaceId, propertyId: kind === "transactions" ? undefined : prop, dryRun, rows });
    setRes(r);
    if (r.ok && !dryRun) setRows(blank(8, cols.length));
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{spec.blurb}</p>

      <div className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div><label className="label" htmlFor={`file-${kind}`}>Cargar desde Excel (.xlsx) o CSV</label>
            <input id={`file-${kind}`} type="file" accept=".xlsx,.csv,.txt" className="input" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></div>
          {kind !== "transactions" && properties.length > 1 && (
            <div><label className="label" htmlFor={`prop-${kind}`}>{targetLabel}</label>
              <select id={`prop-${kind}`} className="input" value={prop} onChange={(e) => setProp(e.target.value)}>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          )}
        </div>
        {fileErr && <p role="alert" className="text-sm text-negative">{fileErr}</p>}
        {sheets && mapped && (
          <div className="space-y-3 rounded-2xl inset p-4 text-sm">
            {sheets.length > 1 && (
              <div><label className="label" htmlFor="sheet">Hoja</label>
                <select id="sheet" className="input !w-auto" value={sheetIdx} onChange={(e) => { setSheetIdx(Number(e.target.value)); setPicked(null); }}>{sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}</select></div>
            )}
            <p>Columnas reconocidas: <strong>{mapped.mapped.join(", ")}</strong>.{mapped.missing.length > 0 && <> No encontradas (quedan vacías): {mapped.missing.join(", ")}.</>}</p>
            {groups && selected && (
              <fieldset><legend className="label">Categorías del Excel que quieres traer</legend>
                <div className="flex flex-wrap gap-2">
                  {groups.map(([k, n]) => (
                    <label key={k} className="inline-flex items-center gap-2 rounded-pill bg-white/50 px-3 py-1.5">
                      <input type="checkbox" checked={selected.has(k)} onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(k); else s.delete(k); setPicked(s); }} />
                      {k || "(sin categoría)"} <span className="text-muted">· {n}</span>
                    </label>
                  ))}
                </div></fieldset>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={loadMapped} disabled={!toLoad.length}>Traer {toLoad.length} fila(s) a la tabla</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setSheets(null); setPicked(null); }}>Cancelar</button>
              <span className="text-muted">Podrás revisar y corregir antes de guardar.</span>
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table ref={gridRef} className="w-full border-collapse text-sm" aria-label={`Tabla de ${spec.title}`}>
            <thead>
              <tr className="bg-canvas/60">
                <th className="th w-10 text-center">#</th>
                {cols.map((c) => <th key={c.key} className={`th ${c.numeric ? "text-right" : ""}`} style={{ minWidth: c.width }} title={c.help}>{c.label}</th>)}
                <th className="th w-10"><span className="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => {
                const err = errRows.get(r);
                return (
                  <tr key={r} className={`border-t border-line ${err ? "bg-negative/10" : warnRows.has(r) ? "bg-amber-400/10" : ""}`} title={err}>
                    <td className={`px-2 text-center text-xs ${err ? "font-semibold text-negative" : "text-muted"}`}>{r + 1}</td>
                    {cols.map((c, ci) => {
                      const opts = c.options ?? lookups[c.key];
                      return (
                        <td key={c.key} className="p-0">
                          <input data-cell={`${r}-${ci}`} value={row[ci]} onChange={(e) => setCell(r, ci, e.target.value)} onPaste={(e) => onPaste(e, r, ci)} onKeyDown={(e) => onKey(e, r, ci)}
                            list={opts?.length ? `dl-${kind}-${c.key}` : undefined} inputMode={c.numeric ? "decimal" : undefined} autoComplete="off" spellCheck={false}
                            aria-label={`${c.label}, fila ${r + 1}`} aria-invalid={err ? true : undefined}
                            className={`w-full bg-transparent px-2 py-2 outline-none focus:bg-surface focus:text-ink focus:shadow-[inset_0_0_0_2px_rgb(var(--brand))] ${c.numeric ? "text-right" : ""}`} />
                        </td>
                      );
                    })}
                    <td className="px-1 text-center"><button type="button" aria-label={`Quitar fila ${r + 1}`} className="rounded-full px-2 text-muted hover:text-negative" onClick={() => edit(rows.length > 1 ? rows.filter((_, i) => i !== r) : blank(1, cols.length))}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cols.map((c) => { const o = c.options ?? lookups[c.key]; return o?.length ? <datalist key={c.key} id={`dl-${kind}-${c.key}`}>{o.map((v) => <option key={v} value={v} />)}</datalist> : null; })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={() => rows.length < MAX_BATCH_ROWS && edit([...rows, ...blank(5, cols.length)])}>+ 5 filas</button>
        <button type="button" className="btn btn-ghost" onClick={() => edit(blank(8, cols.length))} disabled={!filled}>Limpiar</button>
        <span className="text-sm text-muted">{filled} fila(s) con datos · Pega desde Excel (Ctrl+V) sobre cualquier celda</span>
        <div className="ml-auto flex gap-3">
          <button type="button" className="btn btn-ghost" disabled={busy || !filled} onClick={() => send(true)}>Revisar</button>
          <button type="button" className="btn btn-primary" disabled={busy || !filled} onClick={() => send(false)}>{busy ? "Guardando…" : `Guardar ${filled || ""} fila(s)`}</button>
        </div>
      </div>

      <PasteBox onLoad={(d) => applyPaste(0, 0, d)} />

      {res && (
        <div role={res.ok ? "status" : "alert"} className={`card space-y-2 text-sm ${res.ok ? "" : "border border-negative/40"}`}>
          <p className={`font-medium ${res.ok ? "text-positive" : "text-negative"}`}>{res.message}</p>
          {res.errors.length > 0 && <ul className="list-disc space-y-0.5 pl-5">{res.errors.slice(0, 40).map((e, i) => <li key={i}>Fila {e.row + 1}: {e.msg}</li>)}{res.errors.length > 40 && <li>… y {res.errors.length - 40} más</li>}</ul>}
          {res.warnings.length > 0 && <details><summary className="cursor-pointer text-muted">{res.warnings.length} aviso(s)</summary><ul className="mt-1 list-disc space-y-0.5 pl-5">{res.warnings.slice(0, 40).map((e, i) => <li key={i}>Fila {e.row + 1}: {e.msg}</li>)}</ul></details>}
        </div>
      )}
    </div>
  );
}

/** Alternativa al pegado en celda (útil en el celular): pega el texto copiado de Excel y se reparte en la tabla. */
function PasteBox({ onLoad }: { onLoad: (d: string[][]) => void }) {
  const [t, setT] = useState("");
  return (
    <details className="card">
      <summary className="cursor-pointer text-sm font-medium">Pegar texto copiado de Excel</summary>
      <div className="mt-3 space-y-3">
        <label className="sr-only" htmlFor="paste-area">Texto copiado de Excel</label>
        <textarea id="paste-area" value={t} onChange={(e) => setT(e.target.value)} rows={5} className="input font-mono" placeholder="Copia las celdas en Excel o Google Sheets (con o sin encabezados) y pégalas aquí." />
        <button type="button" className="btn btn-ghost" disabled={!t.trim()} onClick={() => { onLoad(parseClipboard(t)); setT(""); }}>Cargar en la tabla</button>
      </div>
    </details>
  );
}
