/*
  Warnings:

  - A unique constraint covering the columns `[transactionNsu]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "transactionNsu" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_transactionNsu_key" ON "Order"("transactionNsu");
