import type { IconType } from "react-icons";
import {
  MdAccountBalance, MdAccountBalanceWallet, MdAdd, MdApartment, MdArrowDownward, MdArrowForward, MdArrowUpward, MdAttachFile, MdBalance, MdBuild, MdCardGiftcard, MdCategory,
  MdCelebration, MdChair, MdCheck, MdCheckroom, MdCleaningServices, MdClose, MdCoffee, MdContentCopy, MdCreditCard, MdDelete, MdDesktopWindows, MdDirectionsBus, MdDirectionsCar,
  MdDownload, MdEdit, MdFilterAlt, MdFolder, MdHome, MdHotel, MdInventory2, MdLaptop, MdLightbulb, MdLocalCarWash, MdLocalGasStation, MdLocalLaundryService, MdLocalParking,
  MdManageAccounts, MdMedicalServices, MdMovie, MdOpenInNew, MdPayments, MdPercent, MdPerson, MdPersonOff, MdReceiptLong, MdRestaurant, MdSavings, MdSchool, MdShield,
  MdShoppingBag, MdShoppingCart, MdStore, MdSwapHoriz, MdTrendingDown, MdTrendingUp, MdUndo, MdUpload, MdVpnKey, MdWavingHand, MdWifi, MdWork, MdFlight, MdPets, MdFitnessCenter,
  MdChildCare, MdSell, MdPause, MdPlayArrow, MdCalculate, MdTableChart, MdInfoOutline, MdLinkOff, MdPersonAdd, MdRestartAlt, MdSettings, MdSearch,
} from "react-icons/md";

/** Iconos de interfaz (Material Icons de Google). Se piden por nombre para poder usarlos también desde componentes de servidor. */
export const UI_ICONS = {
  add: MdAdd, edit: MdEdit, delete: MdDelete, key: MdVpnKey, person_off: MdPersonOff, person: MdPerson, person_add: MdPersonAdd, manage_accounts: MdManageAccounts, swap: MdSwapHoriz,
  check: MdCheck, close: MdClose, receipt: MdReceiptLong, attach: MdAttachFile, bank: MdAccountBalance, wallet: MdAccountBalanceWallet, card: MdCreditCard, balance: MdBalance,
  celebration: MdCelebration, trending_up: MdTrendingUp, trending_down: MdTrendingDown, wave: MdWavingHand, open: MdOpenInNew, upload: MdUpload, download: MdDownload, copy: MdContentCopy,
  calculate: MdCalculate, table: MdTableChart, info: MdInfoOutline, pause: MdPause, play: MdPlayArrow, undo: MdUndo, unlink: MdLinkOff, restart: MdRestartAlt, settings: MdSettings, search: MdSearch, filter: MdFilterAlt, arrow_right: MdArrowForward, arrow_up: MdArrowUpward, arrow_down: MdArrowDownward,
} as const satisfies Record<string, IconType>;
export type UiIcon = keyof typeof UI_ICONS;

/** Iconos para categorías y cuentas: lo que se guarda en la columna `emoji` es el nombre de uno de estos. */
export const CATEGORY_ICONS = {
  category: MdCategory, hotel: MdHotel, payments: MdPayments, commission: MdPercent, cleaning: MdCleaningServices, laundry: MdLocalLaundryService, coffee: MdCoffee,
  inventory: MdInventory2, apartment: MdApartment, bulb: MdLightbulb, wifi: MdWifi, build: MdBuild, folder: MdFolder, chair: MdChair, work: MdWork, home: MdHome,
  cart: MdShoppingCart, bus: MdDirectionsBus, health: MdMedicalServices, movie: MdMovie, bag: MdShoppingBag, car: MdDirectionsCar, gift: MdCardGiftcard, gas: MdLocalGasStation,
  parking: MdLocalParking, carwash: MdLocalCarWash, shield: MdShield, receipt: MdReceiptLong, laptop: MdLaptop, bank: MdAccountBalance, desktop: MdDesktopWindows, balance: MdBalance,
  card: MdCreditCard, savings: MdSavings, wallet: MdAccountBalanceWallet, food: MdRestaurant, school: MdSchool, flight: MdFlight, pets: MdPets, fitness: MdFitnessCenter,
  kids: MdChildCare, clothes: MdCheckroom, store: MdStore, tag: MdSell,
} as const satisfies Record<string, IconType>;
export type CategoryIconKey = keyof typeof CATEGORY_ICONS;
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

/** Emojis que ya hay guardados en la base de datos → su icono. */
const LEGACY: Record<string, CategoryIconKey> = {
  "🛏": "hotel", "💵": "payments", "💸": "commission", "🧹": "cleaning", "🧺": "laundry", "☕": "coffee", "📦": "inventory", "🏢": "apartment", "💡": "bulb", "📶": "wifi",
  "🔧": "build", "🗂": "folder", "🛋": "chair", "💼": "work", "🏠": "home", "🛒": "cart", "🚌": "bus", "🩺": "health", "🎬": "movie", "🛍": "bag", "🚗": "car", "🎁": "gift",
  "⛽": "gas", "🅿": "parking", "🧽": "carwash", "🛡": "shield", "🧾": "receipt", "💻": "laptop", "🏛": "bank", "🏦": "bank", "🖥": "desktop", "⚖": "balance", "💳": "card",
};

/** Nombre de icono válido para un valor guardado (nombre de icono, emoji antiguo o vacío). */
export function categoryIconKey(value?: string | null): CategoryIconKey {
  if (!value) return "category";
  if (value in CATEGORY_ICONS) return value as CategoryIconKey;
  return LEGACY[value.replace(/️/g, "")] ?? "category";
}

export function Icon({ name, size = 20, className, label }: { name: UiIcon; size?: number; className?: string; label?: string }) {
  const C = UI_ICONS[name];
  return <C size={size} className={className} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} />;
}

export function CategoryIcon({ value, size = 20, className }: { value?: string | null; size?: number; className?: string }) {
  const C = CATEGORY_ICONS[categoryIconKey(value)];
  return <C size={size} className={className} aria-hidden />;
}
