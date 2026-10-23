import { ActionForm } from "./action-form";
import type { ActionState } from "@/lib/actions";

/** Importador de CSV (sube el archivo al servidor, que lo valida fila por fila). */
export function CsvImport({ action, workspaceId, properties, columns, title }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  workspaceId: string;
  properties: { id: string; name: string }[];
  columns: string;
  title: string;
}) {
  return (
    <details className="card">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted">Columnas del archivo (primera fila = encabezados): <code>{columns}</code>. En Excel: Guardar como → CSV. Los ítems que ya existen no se duplican.</p>
        <ActionForm action={action} submitLabel="Importar" className="space-y-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="file">Archivo CSV</label><input id="file" name="file" type="file" accept=".csv,text/csv,text/plain" required className="input" /></div>
          </div>
        </ActionForm>
      </div>
    </details>
  );
}
