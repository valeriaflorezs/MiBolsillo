import { ThemeToggle } from "./theme-toggle";

export function SideRail() {
  return (
    <aside className="hidden flex-col items-center gap-6 md:flex" aria-label="Preferencias">
      <ThemeToggle />
    </aside>
  );
}
