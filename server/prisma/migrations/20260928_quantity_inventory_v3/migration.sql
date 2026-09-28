-- Quantity inventory v3: bucket fields + stock counts, adjustments, checkouts

ALTER TABLE "InventoryItemType" ALTER COLUMN "serialTracking" SET DEFAULT false;

ALTER TABLE "InventoryStockBalance" ADD COLUMN "goodQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryStockBalance" ADD COLUMN "missingQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryStockBalance" ADD COLUMN "damagedQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryStockBalance" ADD COLUMN "outQty" INTEGER NOT NULL DEFAULT 0;

UPDATE "InventoryStockBalance" SET "goodQty" = "quantity";

ALTER TABLE "InventoryStockBalance" DROP COLUMN "quantity";

ALTER TABLE "InventoryStockBalance" ALTER COLUMN "location" SET DEFAULT 'Store Room';

CREATE TABLE "InventoryStockCount" (
    "id" TEXT NOT NULL,
    "countedAt" TEXT NOT NULL,
    "countedBy" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FINALIZED',
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "InventoryStockCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryStockCountLine" (
    "id" TEXT NOT NULL,
    "stockCountId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "systemGoodQty" INTEGER NOT NULL,
    "actualGoodQty" INTEGER NOT NULL,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "surplusQty" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    CONSTRAINT "InventoryStockCountLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "adjustedAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryCheckout" (
    "id" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "issuedQty" INTEGER NOT NULL,
    "issuedAt" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expectedReturnAt" TEXT,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "returnedAt" TEXT,
    "returnedBy" TEXT,
    "returnRemarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "InventoryCheckout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryStockCount_countedAt_idx" ON "InventoryStockCount"("countedAt");
CREATE INDEX "InventoryStockCount_countedBy_idx" ON "InventoryStockCount"("countedBy");
CREATE INDEX "InventoryStockCountLine_stockCountId_idx" ON "InventoryStockCountLine"("stockCountId");
CREATE INDEX "InventoryStockCountLine_itemTypeId_idx" ON "InventoryStockCountLine"("itemTypeId");
CREATE INDEX "InventoryAdjustment_itemTypeId_idx" ON "InventoryAdjustment"("itemTypeId");
CREATE INDEX "InventoryAdjustment_adjustedAt_idx" ON "InventoryAdjustment"("adjustedAt");
CREATE INDEX "InventoryAdjustment_type_idx" ON "InventoryAdjustment"("type");
CREATE INDEX "InventoryCheckout_itemTypeId_idx" ON "InventoryCheckout"("itemTypeId");
CREATE INDEX "InventoryCheckout_status_idx" ON "InventoryCheckout"("status");
CREATE INDEX "InventoryCheckout_issuedAt_idx" ON "InventoryCheckout"("issuedAt");
CREATE INDEX "InventoryCheckout_expectedReturnAt_idx" ON "InventoryCheckout"("expectedReturnAt");

ALTER TABLE "InventoryStockCountLine" ADD CONSTRAINT "InventoryStockCountLine_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "InventoryStockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryStockCountLine" ADD CONSTRAINT "InventoryStockCountLine_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCheckout" ADD CONSTRAINT "InventoryCheckout_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "InventoryItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
