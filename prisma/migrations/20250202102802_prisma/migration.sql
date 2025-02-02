/*
  Warnings:

  - You are about to drop the column `orderId` on the `Customer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_orderId_fkey";

-- DropIndex
DROP INDEX "Customer_orderId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "orderId";

-- CreateTable
CREATE TABLE "_CustomerToOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerToOrder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CustomerToOrder_B_index" ON "_CustomerToOrder"("B");

-- AddForeignKey
ALTER TABLE "_CustomerToOrder" ADD CONSTRAINT "_CustomerToOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToOrder" ADD CONSTRAINT "_CustomerToOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
