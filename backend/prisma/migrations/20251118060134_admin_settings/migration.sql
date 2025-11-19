-- AlterEnum
ALTER TYPE "MilestoneStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "emailApiKey" TEXT,
ADD COLUMN     "emailApiUrl" TEXT,
ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailFrom" TEXT,
ADD COLUMN     "emailProvider" TEXT,
ADD COLUMN     "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushVapidPrivateKey" TEXT,
ADD COLUMN     "pushVapidPublicKey" TEXT,
ALTER COLUMN "id" DROP DEFAULT;
