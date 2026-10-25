-- CreateEnum
CREATE TYPE "LoanRateType" AS ENUM ('EFFECTIVE_ANNUAL', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LoanPaymentKind" AS ENUM ('INSTALLMENT', 'EXTRA');

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "principal" DECIMAL(14,2) NOT NULL,
    "rateType" "LoanRateType" NOT NULL DEFAULT 'EFFECTIVE_ANNUAL',
    "ratePct" DECIMAL(7,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "firstPaymentDate" TIMESTAMP(3) NOT NULL,
    "monthlyPayment" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" "LoanPaymentKind" NOT NULL DEFAULT 'INSTALLMENT',
    "amount" DECIMAL(14,2) NOT NULL,
    "interestOverride" DECIMAL(14,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAllocation" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_workspaceId_idx" ON "Loan"("workspaceId");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_date_idx" ON "LoanPayment"("loanId", "date");

-- CreateIndex
CREATE INDEX "LoanPayment_workspaceId_idx" ON "LoanPayment"("workspaceId");

-- CreateIndex
CREATE INDEX "LoanAllocation_loanId_idx" ON "LoanAllocation"("loanId");

-- CreateIndex
CREATE INDEX "LoanAllocation_workspaceId_idx" ON "LoanAllocation"("workspaceId");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAllocation" ADD CONSTRAINT "LoanAllocation_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

