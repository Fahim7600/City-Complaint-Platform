-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approvalStatus" "ApprovalStatus",
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "requestedRole" "Role";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
