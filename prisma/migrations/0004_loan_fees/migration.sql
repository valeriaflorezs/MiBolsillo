-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "insuranceMonthly" DECIMAL(14,2),
ADD COLUMN "managementFeeMonthly" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "LoanPayment" ADD COLUMN "fees" DECIMAL(14,2);
