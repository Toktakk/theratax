-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "town" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "recipientAddressLine1" TEXT,
ADD COLUMN     "recipientAddressLine2" TEXT,
ADD COLUMN     "recipientPostcode" TEXT,
ADD COLUMN     "recipientTown" TEXT,
ADD COLUMN     "supplierAddressLine1" TEXT,
ADD COLUMN     "supplierAddressLine2" TEXT,
ADD COLUMN     "supplierPostcode" TEXT,
ADD COLUMN     "supplierTown" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "town" TEXT;

-- AlterTable
ALTER TABLE "Workplace" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "town" TEXT;
