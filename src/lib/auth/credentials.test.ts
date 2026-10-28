import { describe, expect, it } from "vitest";
import { generatePassword, hashPassword, USERNAME_RE, verifyPassword } from "./credentials";

describe("credenciales", () => {
  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const h = await hashPassword("Clave-Segura-123");
    expect(await verifyPassword("Clave-Segura-123", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
  });
  it("usuario inexistente siempre falla", async () => {
    expect(await verifyPassword("lo-que-sea", null)).toBe(false);
  });
  it("el hash es distinto en cada llamada (sal)", async () => {
    expect(await hashPassword("x")).not.toBe(await hashPassword("x"));
  });
  it("genera contraseñas de 14 caracteres sin ambiguos", () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(14);
    expect(pw).not.toMatch(/[0O1lI]/);
  });
  it("valida el formato de usuario", () => {
    expect(USERNAME_RE.test("nombre.apellido")).toBe(true);
    for (const bad of ["ab", "Con Espacio", "MAYUS", "x@y.co", "-guion"]) expect(USERNAME_RE.test(bad)).toBe(false);
  });
});
