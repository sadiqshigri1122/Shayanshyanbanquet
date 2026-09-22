-- Inventory & Kitchen modules

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentHolder" TEXT,
    "purchaseDate" TEXT,
    "purchaseReference" TEXT,
    "supplier" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "transactionDate" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenPurchase" (
    "id" TEXT NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL,
    "purchasedBy" TEXT NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "KitchenPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenStock" (
    "id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseDate" TEXT,
    "lastPurchaseCost" INTEGER,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "KitchenStock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenStockUsage" (
    "id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "bookingId" TEXT,
    "usedBy" TEXT NOT NULL,
    "usedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "KitchenStockUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItem_serialNumber_key" ON "InventoryItem"("serialNumber");
CREATE INDEX "InventoryItem_serialNumber_idx" ON "InventoryItem"("serialNumber");
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX "InventoryItem_location_idx" ON "InventoryItem"("location");

CREATE INDEX "InventoryTransaction_serialNumber_idx" ON "InventoryTransaction"("serialNumber");
CREATE INDEX "InventoryTransaction_inventoryItemId_idx" ON "InventoryTransaction"("inventoryItemId");
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");
CREATE INDEX "InventoryTransaction_createdBy_idx" ON "InventoryTransaction"("createdBy");
CREATE INDEX "InventoryTransaction_action_idx" ON "InventoryTransaction"("action");

CREATE INDEX "KitchenPurchase_purchaseDate_idx" ON "KitchenPurchase"("purchaseDate");
CREATE INDEX "KitchenPurchase_supplier_idx" ON "KitchenPurchase"("supplier");
CREATE INDEX "KitchenPurchase_category_idx" ON "KitchenPurchase"("category");
CREATE INDEX "KitchenPurchase_item_idx" ON "KitchenPurchase"("item");

CREATE UNIQUE INDEX "KitchenStock_item_key" ON "KitchenStock"("item");
CREATE INDEX "KitchenStock_category_idx" ON "KitchenStock"("category");

CREATE INDEX "KitchenStockUsage_item_idx" ON "KitchenStockUsage"("item");
CREATE INDEX "KitchenStockUsage_usedAt_idx" ON "KitchenStockUsage"("usedAt");

ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
