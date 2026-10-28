"use client";

import { useState } from "react";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS, CategoryIcon, categoryIconKey } from "@/components/ui/icons";

const NAMES: Record<string, string> = { category: "Categoría", hotel: "Hospedaje", payments: "Dinero", commission: "Comisión", cleaning: "Aseo", laundry: "Lavandería", coffee: "Insumos", inventory: "Inventario", apartment: "Edificio", bulb: "Servicios", wifi: "Internet", build: "Mantenimiento", folder: "Carpeta", chair: "Muebles", work: "Trabajo", home: "Vivienda", cart: "Compras", bus: "Transporte", health: "Salud", movie: "Ocio", bag: "Compras grandes", car: "Vehículo", gift: "Regalos", gas: "Combustible", parking: "Parqueo", carwash: "Lavado", shield: "Seguros", receipt: "Factura", laptop: "Equipos", bank: "Banco", desktop: "Computador", balance: "Ajustes", card: "Tarjeta", savings: "Ahorro", wallet: "Billetera", food: "Comida", school: "Educación", flight: "Viajes", pets: "Mascotas", fitness: "Deporte", kids: "Niños", clothes: "Ropa", store: "Tienda", tag: "Etiqueta" };

/** Selector de icono para una categoría: envía el nombre del icono elegido en un campo oculto. */
export function IconPicker({ name = "emoji", defaultValue }: { name?: string; defaultValue?: string | null }) {
  const [value, setValue] = useState<string>(defaultValue ? categoryIconKey(defaultValue) : "category");
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Icono" className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
        {CATEGORY_ICON_KEYS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} title={NAMES[k] ?? k} aria-label={NAMES[k] ?? k} onClick={() => setValue(k)}
            className={`grid size-9 place-items-center rounded-xl border transition ${value === k ? "border-brand bg-brand/20 text-brand-text" : "border-line hover:bg-canvas"}`}><CategoryIcon value={k} /></button>
        ))}
      </div>
    </div>
  );
}
export const ICON_COUNT = Object.keys(CATEGORY_ICONS).length;
