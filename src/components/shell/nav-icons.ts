import { BarChart3, BellRing, Building2, CalendarCheck, Gift, Hammer, LayoutDashboard, PiggyBank, Receipt, Repeat, Scale, Settings, Tags, UserRound, Wallet } from "lucide-react";
import type { NavIcon } from "@/lib/nav";

/** Iconos de cada sección (compartidos por el menú lateral de escritorio y la pantalla “Todo” de móvil). */
export const NAV_ICONS: Record<NavIcon, typeof Wallet> = {
  home: LayoutDashboard, tx: Receipt, stats: BarChart3, capex: Hammer, pyg: Scale, res: CalendarCheck, fixed: Repeat, props: Building2,
  accounts: Wallet, budget: PiggyBank, cats: Tags, wish: Gift, settings: Settings, pending: BellRing, account: UserRound,
};
