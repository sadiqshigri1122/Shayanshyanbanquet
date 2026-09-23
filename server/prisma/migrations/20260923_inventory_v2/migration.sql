-- Inventory Module V2: item types, quantity stock, event inventory

CREATE TABLE IF NOT EXISTS "InventoryItemType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "serialTracking" BOOLEAN NOT NULL DEFAULT true,
    "defaultLocation" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "InventoryItemType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItemType_name_category_key" ON "InventoryItemType"("name", "category");
CREATE INDEX IF NOT EXISTS "InventoryItemType_category_idx" ON "InventoryItemType"("category");

ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "itemTypeId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "condition" TEXT NOT NULL DEFAULT 'Good';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "activeBookingId" TEXT;

CREATE INDEX IF NOT EXISTS "InventoryItem_itemTypeId_idx" ON "InventoryItem"("itemTypeId");
CREATE INDEX IF NOT EXISTS "InventoryItem_activeBookingId_idx" ON "InventoryItem"("activeBookingId");

ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "reference" TEXT;
CREATE INDEX IF NOT EXISTS "InventoryTransaction_bookingId_idx" ON "InventoryTransaction"("bookingId");

CREATE TABLE IF NOT EXISTS "InventoryStockBalance" (
    "id" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "InventoryStockBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryStockBalance_itemTypeId_location_key" ON "InventoryStockBalance"("itemTypeId", "location");
CREATE INDEX IF NOT EXISTS "InventoryStockBalance_location_idx" ON "InventoryStockBalance"("location");

CREATE TABLE IF NOT EXISTS "InventoryQuantityMovement" (
    "id" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "bookingId" TEXT,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "InventoryQuantityMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryQuantityMovement_itemTypeId_idx" ON "InventoryQuantityMovement"("itemTypeId");
CREATE INDEX IF NOT EXISTS "InventoryQuantityMovement_bookingId_idx" ON "InventoryQuantityMovement"("bookingId");
CREATE INDEX IF NOT EXISTS "InventoryQuantityMovement_createdAt_idx" ON "InventoryQuantityMovement"("createdAt");
CREATE INDEX IF NOT EXISTS "InventoryQuantityMovement_action_idx" ON "InventoryQuantityMovement"("action");

CREATE TABLE IF NOT EXISTS "EventInventoryLine" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "requiredQty" INTEGER NOT NULL,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "issuedQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'REQUIRED',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "EventInventoryLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventInventoryLine_bookingId_idx" ON "EventInventoryLine"("bookingId");
CREATE INDEX IF NOT EXISTS "EventInventoryLine_itemTypeId_idx" ON "EventInventoryLine"("itemTypeId");
CREATE INDEX IF NOT EXISTS "EventInventoryLine_status_idx" ON "EventInventoryLine"("status");

CREATE TABLE IF NOT EXISTS "EventInventoryAsset" (
    "id" TEXT NOT NULL,
    "eventLineId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TEXT,
    "returnedAt" TEXT,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "EventInventoryAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventInventoryAsset_eventLineId_inventoryItemId_key" ON "EventInventoryAsset"("eventLineId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "EventInventoryAsset_inventoryItemId_idx" ON "EventInventoryAsset"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "EventInventoryAsset_status_idx" ON "EventInventoryAsset"("status");

ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_itemTypeId_fkey";
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryStockBalance" DROP CONSTRAINT IF EXISTS "InventoryStockBalance_itemTypeId_fkey";
ALTER TABLE "InventoryStockBalance" ADD CONSTRAINT "InventoryStockBalance_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryQuantityMovement" DROP CONSTRAINT IF EXISTS "InventoryQuantityMovement_itemTypeId_fkey";
ALTER TABLE "InventoryQuantityMovement" ADD CONSTRAINT "InventoryQuantityMovement_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInventoryLine" DROP CONSTRAINT IF EXISTS "EventInventoryLine_bookingId_fkey";
ALTER TABLE "EventInventoryLine" ADD CONSTRAINT "EventInventoryLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInventoryLine" DROP CONSTRAINT IF EXISTS "EventInventoryLine_itemTypeId_fkey";
ALTER TABLE "EventInventoryLine" ADD CONSTRAINT "EventInventoryLine_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventInventoryAsset" DROP CONSTRAINT IF EXISTS "EventInventoryAsset_eventLineId_fkey";
ALTER TABLE "EventInventoryAsset" ADD CONSTRAINT "EventInventoryAsset_eventLineId_fkey" FOREIGN KEY ("eventLineId") REFERENCES "EventInventoryLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInventoryAsset" DROP CONSTRAINT IF EXISTS "EventInventoryAsset_inventoryItemId_fkey";
ALTER TABLE "EventInventoryAsset" ADD CONSTRAINT "EventInventoryAsset_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill item types from existing serialized assets
INSERT INTO "InventoryItemType" ("id", "name", "category", "unit", "serialTracking", "defaultLocation", "notes", "createdBy", "createdAt", "updatedAt")
SELECT
    'ityp' || substr(md5("itemName" || '|' || "category"), 1, 12),
    "itemName",
    "category",
    'unit',
    true,
    NULL,
    NULL,
    'system',
    MIN("createdAt"),
    MAX("updatedAt")
FROM "InventoryItem"
GROUP BY "itemName", "category"
ON CONFLICT DO NOTHING;

UPDATE "InventoryItem" i
SET "itemTypeId" = t."id"
FROM "InventoryItemType" t
WHERE i."itemName" = t."name" AND i."category" = t."category" AND i."itemTypeId" IS NULL;
