-- CreateEnum
CREATE TYPE "ShowcaseMode" AS ENUM ('AUTOMATIC', 'MANUAL', 'MIXED');

-- CreateEnum
CREATE TYPE "ShowcaseSectionKey" AS ENUM ('OFFERS', 'FEATURED');

-- CreateTable
CREATE TABLE "StorefrontSection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "key" "ShowcaseSectionKey" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "ShowcaseMode" NOT NULL DEFAULT 'AUTOMATIC',
    "maxItems" INTEGER NOT NULL DEFAULT 8,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorefrontSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorefrontSection_storeId_enabled_sortOrder_idx" ON "StorefrontSection"("storeId", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSection_storeId_key_key" ON "StorefrontSection"("storeId", "key");

-- CreateIndex
CREATE INDEX "StorefrontSectionItem_sectionId_sortOrder_idx" ON "StorefrontSectionItem"("sectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSectionItem_sectionId_productId_key" ON "StorefrontSectionItem"("sectionId", "productId");

-- AddForeignKey
ALTER TABLE "StorefrontSection" ADD CONSTRAINT "StorefrontSection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontSectionItem" ADD CONSTRAINT "StorefrontSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StorefrontSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontSectionItem" ADD CONSTRAINT "StorefrontSectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
