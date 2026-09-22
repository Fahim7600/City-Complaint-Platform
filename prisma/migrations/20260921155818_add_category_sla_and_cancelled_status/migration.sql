-- AlterEnum
ALTER TYPE "ComplaintStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "slaHours" INTEGER NOT NULL DEFAULT 72;
