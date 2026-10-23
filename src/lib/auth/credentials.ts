import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, KEYLEN = 32;

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{3,29}$/;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  // Con usuario inexistente se compara contra un hash falso para no revelar por tiempo si el usuario existe.
  const [alg, n, r, p, salt, key] = (stored ?? DUMMY).split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(key, "base64");
  const got = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return timingSafeEqual(got, expected) && Boolean(stored);
}
const DUMMY = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(KEYLEN).toString("base64")}`;

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar o copiar sin errores.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export function generatePassword(length = 14) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
