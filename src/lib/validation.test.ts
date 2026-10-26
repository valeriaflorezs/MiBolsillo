import { describe, expect, it } from "vitest";
import { dateStr, intBetween, money, opt, percent, positive, quantity, signedMoney } from "./validation";
import { parseMoney } from "./csv";

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => s.safeParse(v).success;

describe("números estrictos", () => {
  it("el monto acepta números simples con hasta 2 decimales", () => {
    for (const v of ["0", "1500000", "99.9", "99,90", " 120 ", 15, "0.01"]) expect(ok(money, v), String(v)).toBe(true);
    expect(money.parse("99,90")).toBe(99.9);
  });

  it("el monto rechaza vacío, texto, notación científica, hex, miles y exceso de decimales", () => {
    for (const v of ["", " ", "abc", "12abc", "1e3", "0x10", "1.500.000", "1,500,000", "--5", "5-", "Infinity", "NaN", "1.234", null, undefined, {}, "$ 100"]) expect(ok(money, v), String(v)).toBe(false);
  });

  it("límites: no negativo, máximo 1e12, positivo > 0", () => {
    expect(ok(money, "-1")).toBe(false);
    expect(ok(money, "1000000000001")).toBe(false);
    expect(ok(positive, "0")).toBe(false);
    expect(ok(positive, "0.01")).toBe(true);
    expect(ok(signedMoney, "-250000")).toBe(true);
    expect(ok(signedMoney, "-1000000000001")).toBe(false);
  });

  it("cantidad: positiva, hasta 3 decimales", () => {
    expect(ok(quantity, "2")).toBe(true);
    expect(ok(quantity, "1.5")).toBe(true);
    expect(ok(quantity, "0.125")).toBe(true);
    for (const v of ["0", "-1", "", "abc", "1.2345", "1e2", "99999999"]) expect(ok(quantity, v), v).toBe(false);
  });

  it("enteros con rango y porcentajes", () => {
    const day = intBetween(1, 31, "Día");
    expect(ok(day, "15")).toBe(true);
    for (const v of ["0", "32", "1.5", "", "x", "1e1"]) expect(ok(day, v), v).toBe(false);
    expect(ok(percent(100), "24")).toBe(true);
    expect(ok(percent(100), "1,8")).toBe(true);
    for (const v of ["-1", "101", "abc", "", "1.23456"]) expect(ok(percent(100), v), v).toBe(false);
  });

  it("campos opcionales: vacío es ausente, pero lo mal escrito sigue siendo error", () => {
    const o = opt(money);
    expect(o.parse("")).toBeUndefined();
    expect(o.parse(undefined)).toBeUndefined();
    expect(o.parse("5")).toBe(5);
    expect(ok(o, "abc")).toBe(false);
  });

  it("fechas: deben existir de verdad y estar entre 2000 y 2100", () => {
    expect(ok(dateStr, "2026-02-28")).toBe(true);
    for (const v of ["2026-02-31", "2026-13-01", "2026-00-10", "1999-12-31", "2101-01-01", "26-01-01", "", "2026-1-5"]) expect(ok(dateStr, v), v).toBe(false);
  });

  it("parseMoney (cargas en lote) tolera símbolos de moneda pero no texto mezclado", () => {
    expect(parseMoney("$ 1.200.000")).toBe(1200000);
    expect(parseMoney("COP 50000")).toBe(50000);
    expect(parseMoney("1,5")).toBe(1.5);
    for (const v of ["12abc", "abc", "", "1e3", "5 pesos"]) expect(parseMoney(v), v).toBeNaN();
  });
});
