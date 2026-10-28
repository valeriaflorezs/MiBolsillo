import { describe, expect, it } from "vitest";
import { isPlatformAdmin, superuserEmail } from "./superuser";

describe("superusuario", () => {
  it("por omisión es solo vflorez.contacto@gmail.com (sin importar mayúsculas)", () => {
    expect(superuserEmail("")).toBe("vflorez.contacto@gmail.com");
    expect(isPlatformAdmin("VFlorez.Contacto@gmail.com", "")).toBe(true);
    expect(isPlatformAdmin("otra@persona.co", "")).toBe(false);
    expect(isPlatformAdmin(null, "")).toBe(false);
  });
  it("SUPERUSER_EMAIL reemplaza al correo, no lo suma", () => {
    expect(isPlatformAdmin("nuevo@x.co", "nuevo@x.co")).toBe(true);
    expect(isPlatformAdmin("vflorez.contacto@gmail.com", "nuevo@x.co")).toBe(false);
  });
});
