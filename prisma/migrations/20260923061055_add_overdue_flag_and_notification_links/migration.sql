-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "overdueNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "relatedEntityType" TEXT;
