-- Expand inventory status model: IN -> AVAILABLE, add lastKnownLocation for missing items
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "lastKnownLocation" TEXT;

UPDATE "InventoryItem" SET "status" = 'AVAILABLE' WHERE "status" = 'IN';
