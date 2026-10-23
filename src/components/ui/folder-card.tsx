/** Sección en forma de carpeta (pestaña + cuerpo), como en la referencia. */
export function FolderCard({ tab, meta, children, className = "" }: { tab: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="folder-head">
        <h2 className="folder-tab">{tab}</h2>
        {meta && <span className="folder-meta">{meta}</span>}
      </div>
      <div className="folder-body">{children}</div>
    </section>
  );
}
