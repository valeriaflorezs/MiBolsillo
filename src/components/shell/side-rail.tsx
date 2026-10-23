import { Building2, LayoutGrid, Settings, Wallet } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const ITEMS = [
  { icon: LayoutGrid, label: "Panel" },
  { icon: Building2, label: "Negocios" },
  { icon: Wallet, label: "Cuentas" },
  { icon: Settings, label: "Ajustes" },
];

export function SideRail() {
  return (
    <aside className="hidden flex-col items-center gap-6 md:flex" aria-label="Accesos rápidos">
      <ThemeToggle />
      <ul className="card flex flex-col gap-1 !rounded-pill !p-2">
        {ITEMS.map(({ icon: Icon, label }, i) => (
          <li key={label}>
            <button type="button" aria-label={label} aria-current={i === 0 ? "page" : undefined}
              className={`grid size-10 place-items-center rounded-full transition-colors ${
                i === 0 ? "bg-ink text-surface" : "text-muted hover:text-ink"
              }`}>
              <Icon size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
