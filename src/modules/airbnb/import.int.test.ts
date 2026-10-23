import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { importCapex, importFixed } from "./import";

describe.skipIf(!process.env.DATABASE_URL)("importadores CSV", () => {
  let workspaceId = "", propertyId = "";
  beforeAll(async () => {
    const ws = await prisma.workspace.create({ data: { name: "Import test", type: "AIRBNB" } });
    workspaceId = ws.id;
    propertyId = (await prisma.property.create({ data: { workspaceId, name: "P" } })).id;
  });
  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  const capex = "categoria,descripcion,cantidad,precio_unitario_presupuestado,precio_unitario_real,tienda\n" +
    "Electrodomésticos,Nevera 470L,1,2000000,2042235,\nMuebles,Cama de 1.40,2,600000,,Homecenter\nRaro,Cosa,1,1,,\n";

  it("importa CAPEX: con precio real = comprado, reporta filas inválidas y no duplica", async () => {
    const r1 = await importCapex(workspaceId, propertyId, capex);
    expect(r1.created).toBe(2);
    expect(r1.errors).toHaveLength(1);
    const items = await prisma.capexItem.findMany({ where: { workspaceId }, orderBy: { itemDescription: "asc" } });
    expect(items.find((i) => i.itemDescription === "Nevera 470L")).toMatchObject({ status: "PURCHASED", capexCategory: "APPLIANCES" });
    expect(items.find((i) => i.itemDescription === "Cama de 1.40")).toMatchObject({ status: "PENDING", quantity: 2, store: "Homecenter" });
    const r2 = await importCapex(workspaceId, propertyId, capex);
    expect(r2.created).toBe(0);
    expect(r2.skipped).toBe(2);
  });

  it("importa gastos fijos con montos en formato es-CO", async () => {
    const r = await importFixed(workspaceId, propertyId, "nombre;concepto;monto;frecuencia;dia\nNetflix;Suscripciones;$ 50.900;Mensual;5\nSeguro;Otro;1.200.000;Anual;1\n");
    expect(r).toMatchObject({ created: 2, errors: [] });
    const f = await prisma.fixedExpense.findFirst({ where: { workspaceId, name: "Seguro" } });
    expect(f).toMatchObject({ frequency: "ANNUAL", concept: "OTHER" });
    expect(Number(f!.amount)).toBe(1200000);
  });
});
