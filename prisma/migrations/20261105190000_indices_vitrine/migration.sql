-- DropIndex
DROP INDEX "Product_storeId_status_idx";

-- DropIndex
DROP INDEX "ProductVariant_productId_idx";

-- CreateIndex
CREATE INDEX "Category_storeId_sortOrder_idx" ON "Category"("storeId", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_storeId_status_createdAt_idx" ON "Product"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_stock_idx" ON "ProductVariant"("productId", "isActive", "stock");
