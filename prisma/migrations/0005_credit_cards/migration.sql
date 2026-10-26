-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN "cutoffDay" INTEGER,
ADD COLUMN "paymentDay" INTEGER,
ADD COLUMN "rateType" "LoanRateType",
ADD COLUMN "ratePct" DECIMAL(7,4),
ADD COLUMN "insuranceMonthly" DECIMAL(14,2),
ADD COLUMN "managementFeeMonthly" DECIMAL(14,2);
