-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."WorkspaceType" AS ENUM ('AIRBNB', 'PERSONAL', 'FREELANCE', 'GIG_ECONOMY');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('CASH', 'BANK', 'DIGITAL_WALLET', 'CREDIT_CARD', 'LOAN_FUND');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."ExpenseKind" AS ENUM ('FIXED_OPEX', 'VARIABLE', 'CAPEX');

-- CreateEnum
CREATE TYPE "public"."PygLine" AS ENUM ('REVENUE', 'COMMISSION', 'CLEANING', 'AMENITIES', 'OTHER_VARIABLE', 'ADMIN', 'UTILITIES', 'SUBSCRIPTIONS', 'MAINTENANCE', 'OTHER_FIXED', 'CAPEX', 'NON_OPERATING');

-- CreateEnum
CREATE TYPE "public"."PurchaseStatus" AS ENUM ('PENDING', 'PURCHASED');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('PENDING', 'RECEIVED');

-- CreateEnum
CREATE TYPE "public"."ReservationChannel" AS ENUM ('AIRBNB', 'BOOKING', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FixedExpenseConcept" AS ENUM ('HOA', 'UTILITIES', 'SUBSCRIPTIONS', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "public"."CapexCategory" AS ENUM ('FURNITURE', 'APPLIANCES', 'RENOVATION', 'DECOR', 'LINENS_KITCHENWARE', 'TECH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OcrStatus" AS ENUM ('NOT_REQUIRED', 'QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."WorkspaceType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'OPERATOR',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(14,2),
    "emoji" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "expenseKind" "public"."ExpenseKind",
    "pygLine" "public"."PygLine" NOT NULL DEFAULT 'OTHER_VARIABLE',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PAID',
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "transferAccountId" TEXT,
    "categoryId" TEXT,
    "vendor" TEXT,
    "description" TEXT,
    "receiptUrl" TEXT,
    "propertyId" TEXT,
    "reservationId" TEXT,
    "fixedExpenseId" TEXT,
    "capexItemId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlannedPurchase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "store" TEXT,
    "url" TEXT,
    "estimatedPrice" DECIMAL(14,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Budget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "propertyId" TEXT,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CapexItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "capexCategory" "public"."CapexCategory" NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "budgetedUnitPrice" DECIMAL(14,2) NOT NULL,
    "actualUnitPrice" DECIMAL(14,2),
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "store" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CapexItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "channel" "public"."ReservationChannel" NOT NULL DEFAULT 'AIRBNB',
    "guestName" TEXT,
    "externalCode" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "cleaningFeeCharged" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platformCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "payoutStatus" "public"."PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payoutDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FixedExpense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "concept" "public"."FixedExpenseConcept" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "public"."Frequency" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER,
    "startsOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsOn" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "transactionId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT,
    "sizeBytes" INTEGER,
    "ocrStatus" "public"."OcrStatus" NOT NULL DEFAULT 'QUEUED',
    "ocrProvider" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "rawOcrData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "auth_accounts_userId_idx" ON "public"."auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_providerAccountId_key" ON "public"."auth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "public"."WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "public"."WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "public"."WorkspaceInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_workspaceId_email_key" ON "public"."WorkspaceInvite"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "FinancialAccount_workspaceId_idx" ON "public"."FinancialAccount"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_workspaceId_name_key" ON "public"."FinancialAccount"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Category_workspaceId_pygLine_idx" ON "public"."Category"("workspaceId", "pygLine");

-- CreateIndex
CREATE UNIQUE INDEX "Category_workspaceId_parentId_name_key" ON "public"."Category"("workspaceId", "parentId", "name");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_date_idx" ON "public"."Transaction"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_status_date_idx" ON "public"."Transaction"("workspaceId", "status", "date");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_categoryId_date_idx" ON "public"."Transaction"("workspaceId", "categoryId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "public"."Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_date_idx" ON "public"."Transaction"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "public"."Transaction"("createdById");

-- CreateIndex
CREATE INDEX "PlannedPurchase_workspaceId_status_idx" ON "public"."PlannedPurchase"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Budget_workspaceId_month_idx" ON "public"."Budget"("workspaceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_workspaceId_categoryId_propertyId_month_key" ON "public"."Budget"("workspaceId", "categoryId", "propertyId", "month");

-- CreateIndex
CREATE INDEX "Property_workspaceId_idx" ON "public"."Property"("workspaceId");

-- CreateIndex
CREATE INDEX "CapexItem_workspaceId_propertyId_status_idx" ON "public"."CapexItem"("workspaceId", "propertyId", "status");

-- CreateIndex
CREATE INDEX "Reservation_workspaceId_checkIn_idx" ON "public"."Reservation"("workspaceId", "checkIn");

-- CreateIndex
CREATE INDEX "Reservation_propertyId_checkIn_checkOut_idx" ON "public"."Reservation"("propertyId", "checkIn", "checkOut");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_propertyId_externalCode_key" ON "public"."Reservation"("propertyId", "externalCode");

-- CreateIndex
CREATE INDEX "FixedExpense_workspaceId_propertyId_active_idx" ON "public"."FixedExpense"("workspaceId", "propertyId", "active");

-- CreateIndex
CREATE INDEX "Attachment_workspaceId_createdAt_idx" ON "public"."Attachment"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_transactionId_idx" ON "public"."Attachment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "public"."Attachment"("storageKey");

-- AddForeignKey
ALTER TABLE "public"."auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialAccount" ADD CONSTRAINT "FinancialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "public"."FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "public"."FixedExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_capexItemId_fkey" FOREIGN KEY ("capexItemId") REFERENCES "public"."CapexItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlannedPurchase" ADD CONSTRAINT "PlannedPurchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CapexItem" ADD CONSTRAINT "CapexItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CapexItem" ADD CONSTRAINT "CapexItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CapexItem" ADD CONSTRAINT "CapexItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FixedExpense" ADD CONSTRAINT "FixedExpense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FixedExpense" ADD CONSTRAINT "FixedExpense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

