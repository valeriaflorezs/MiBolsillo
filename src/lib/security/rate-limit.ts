// Limitador en memoria (ventana fija). Válido mientras el servicio web tenga UNA réplica en Railway.
// Si se escala a varias réplicas, reemplazar el Map por Redis (Railway plugin / Upstash).
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (++h.count > limit) throw new Error("RATE_LIMITED");
}
