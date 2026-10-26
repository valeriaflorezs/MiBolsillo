-- Categorías de sistema (fuera del PyG) para los negocios que ya existen. Idempotente: no duplica si ya hay una con ese nombre.
INSERT INTO "Category" ("id", "workspaceId", "name", "emoji", "expenseKind", "pygLine", "archived", "createdAt")
SELECT 'c' || substr(md5(w."id" || c.name || clock_timestamp()::text || random()::text), 1, 24), w."id", c.name, c.emoji, c.kind::"ExpenseKind", 'NON_OPERATING'::"PygLine", false, CURRENT_TIMESTAMP
FROM "Workspace" w
CROSS JOIN (VALUES
  ('Desembolso de crédito', '🏦', NULL),
  ('Ajuste de saldo a favor', '⚖️', NULL),
  ('Ajuste de saldo en contra', '⚖️', 'FIXED_OPEX'),
  ('Intereses y cargos financieros', '🏦', 'FIXED_OPEX')
) AS c(name, emoji, kind)
WHERE NOT EXISTS (SELECT 1 FROM "Category" x WHERE x."workspaceId" = w."id" AND x."name" = c.name AND x."parentId" IS NULL);
