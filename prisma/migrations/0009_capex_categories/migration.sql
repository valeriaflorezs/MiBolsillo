-- Unifica las categorías del CAPEX con las de Movimientos: cada ítem apunta a una Category de tipo CAPEX.
-- 1) Crea (si no existen) las categorías CAPEX equivalentes a la lista fija anterior, solo para las que cada negocio usa.
INSERT INTO "Category" ("id", "workspaceId", "name", "emoji", "expenseKind", "pygLine", "archived", "createdAt")
SELECT 'c' || substr(md5(random()::text || clock_timestamp()::text || u."workspaceId" || u."label"), 1, 24),
       u."workspaceId", u."label", u."icon", 'CAPEX', 'CAPEX', false, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT i."workspaceId",
    CASE i."capexCategory"::text WHEN 'FURNITURE' THEN 'Muebles' WHEN 'APPLIANCES' THEN 'Electrodomésticos' WHEN 'RENOVATION' THEN 'Reformas'
      WHEN 'DECOR' THEN 'Decoración' WHEN 'LINENS_KITCHENWARE' THEN 'Ropa de cama y cocina' WHEN 'TECH' THEN 'Tecnología' ELSE 'Otros' END AS "label",
    CASE i."capexCategory"::text WHEN 'FURNITURE' THEN 'chair' WHEN 'APPLIANCES' THEN 'laundry' WHEN 'RENOVATION' THEN 'build'
      WHEN 'DECOR' THEN 'gift' WHEN 'LINENS_KITCHENWARE' THEN 'hotel' WHEN 'TECH' THEN 'laptop' ELSE 'inventory' END AS "icon"
  FROM "CapexItem" i
  WHERE i."categoryId" IS NULL
) u
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" c WHERE c."workspaceId" = u."workspaceId" AND c."name" = u."label" AND c."expenseKind" = 'CAPEX' AND c."parentId" IS NULL
);

-- 2) Asigna a cada ítem la categoría que le corresponde.
UPDATE "CapexItem" i
SET "categoryId" = c."id"
FROM "Category" c
WHERE i."categoryId" IS NULL
  AND c."workspaceId" = i."workspaceId" AND c."expenseKind" = 'CAPEX' AND c."parentId" IS NULL
  AND c."name" = CASE i."capexCategory"::text WHEN 'FURNITURE' THEN 'Muebles' WHEN 'APPLIANCES' THEN 'Electrodomésticos' WHEN 'RENOVATION' THEN 'Reformas'
      WHEN 'DECOR' THEN 'Decoración' WHEN 'LINENS_KITCHENWARE' THEN 'Ropa de cama y cocina' WHEN 'TECH' THEN 'Tecnología' ELSE 'Otros' END;

-- 3) Quita la lista fija.
ALTER TABLE "CapexItem" DROP COLUMN "capexCategory";
DROP TYPE "CapexCategory";
