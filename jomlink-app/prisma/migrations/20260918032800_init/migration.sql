-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SEEKER', 'LINKER', 'BOTH', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'KYC', 'FINANCE', 'DISPUTE', 'COMPLIANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RelationshipCategory" AS ENUM ('CURRENT_EMPLOYEE', 'FORMER_EMPLOYEE', 'BUSINESS_PARTNER', 'CLIENT', 'FORMER_CLIENT', 'SUPPLIER', 'CUSTOMER', 'CONSULTANT', 'ADVISOR', 'INVESTOR', 'PROFESSIONAL_CONTACT', 'INDUSTRY_CONTACT', 'ASSOCIATION_MEMBERSHIP', 'GOVERNMENT_PUBLIC_SECTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipVisibility" AS ENUM ('PUBLIC', 'PLATFORM_ONLY', 'OPPORTUNITY_SPECIFIC');

-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('BUSINESS_INTRODUCTION', 'EXECUTIVE_MEETING', 'INVESTOR_CONNECTION', 'CUSTOMER_CLIENT_CONNECTION', 'SUPPLIER_CONNECTION', 'DISTRIBUTOR_AGENT_CONNECTION', 'STRATEGIC_PARTNER', 'GOVERNMENT_PUBLIC_SECTOR', 'PROFESSIONAL_EXPERT', 'SITE_VISIT_ACCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PROPOSAL_RECEIVED', 'NEGOTIATION', 'LINKER_SELECTED', 'AWAITING_CONFIRMATION', 'IN_PROGRESS', 'APPOINTMENT_SCHEDULED', 'AWAITING_VERIFICATION', 'COMPLETED', 'DISPUTED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConfidentialityLevel" AS ENUM ('PUBLIC', 'MATCHED', 'RESTRICTED', 'PRIVATE_DIRECT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'SELECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConnectionDegree" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PROPOSED', 'ACKNOWLEDGED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING_ACKNOWLEDGEMENT', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'COMPLETED', 'FAILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('OPPORTUNITY_FUNDING', 'ACTIVATION_FEE', 'LINKER_SERVICE_FEE', 'REWARD_RELEASE', 'REFUND', 'PAYOUT', 'WALLET_CREDIT', 'WALLET_DEBIT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeOutcome" AS ENUM ('COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'REFUNDED', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MYR', 'THB', 'VND', 'IDR', 'INR', 'USD');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('INTRODUCTION', 'COMMUNICATION', 'MEETING_PHOTO', 'MEETING_SCREENSHOT', 'APPOINTMENT_CONFIRMATION', 'TARGET_ACKNOWLEDGEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "mobile" TEXT NOT NULL,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "location" TEXT,
    "profilePhotoUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SEEKER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supabaseUserId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "currentPosition" TEXT,
    "currentOrganisation" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsOfExperience" INTEGER,
    "bio" TEXT,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "successRate" DECIMAL(5,2),
    "averageRating" DECIMAL(3,2),
    "responseRate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_history" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "country" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT,
    "entityName" TEXT NOT NULL,
    "category" "RelationshipCategory" NOT NULL,
    "visibility" "RelationshipVisibility" NOT NULL DEFAULT 'PUBLIC',
    "connectionDegree" "ConnectionDegree" NOT NULL DEFAULT 'FIRST',
    "relevanceNote" TEXT,
    "periodLabel" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_verifications" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "method" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "businessProfileId" TEXT,
    "title" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetRole" TEXT,
    "targetRoleExact" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT NOT NULL,
    "businessDescription" TEXT,
    "requiredOutcome" TEXT NOT NULL,
    "connectionMethod" TEXT,
    "acceptableAlternatives" TEXT,
    "geographicPreference" TEXT,
    "deadline" TIMESTAMP(3),
    "offerAmount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MYR',
    "confidentiality" "ConfidentialityLevel" NOT NULL DEFAULT 'PUBLIC',
    "additionalRequirements" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "activationFee" DECIMAL(12,2),
    "fundedAmount" DECIMAL(12,2),
    "isRestrictedCategory" BOOLEAN NOT NULL DEFAULT false,
    "matchScore" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linker_proposals" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "linkerId" TEXT NOT NULL,
    "relationshipId" TEXT,
    "relationshipDeclared" TEXT,
    "proposedTarget" TEXT,
    "proposedMethod" TEXT,
    "proposedDeliverable" TEXT,
    "proposedReward" DECIMAL(12,2) NOT NULL,
    "proposedDeadline" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isTargetSubstitution" BOOLEAN NOT NULL DEFAULT false,
    "substitutionReason" TEXT,
    "agreedReward" DECIMAL(12,2),
    "agreedDeliverable" TEXT,
    "agreedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linker_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_negotiations" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fromRole" "Role" NOT NULL,
    "offeredReward" DECIMAL(12,2) NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COUNTER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "method" TEXT,
    "target" TEXT,
    "remarks" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "linkerId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING_ACKNOWLEDGEMENT',
    "agreedReward" DECIMAL(12,2),
    "targetScheduled" TEXT,
    "completionNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "releaseStatus" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_evidence" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileAccessKey" TEXT,
    "approved" BOOLEAN,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "connectionId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "feeRaw" DECIMAL(12,2),
    "currency" "Currency" NOT NULL DEFAULT 'MYR',
    "exchangeRate" DECIMAL(12,6),
    "settlementAmount" DECIMAL(12,2),
    "description" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_ledger" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "releasedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "connectionId" TEXT,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" "DisputeOutcome",
    "resolutionNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "successfulCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "responseRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cancellationCount" INTEGER NOT NULL DEFAULT 0,
    "disputeCount" INTEGER NOT NULL DEFAULT 0,
    "onTimeCount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT,
    "documentRef" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OPERATIONS',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SEEKER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseUserId_key" ON "users"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_userId_key" ON "member_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_metrics_userId_key" ON "reputation_metrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_members_userId_key" ON "admin_members"("userId");

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_verifications" ADD CONSTRAINT "relationship_verifications_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linker_proposals" ADD CONSTRAINT "linker_proposals_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linker_proposals" ADD CONSTRAINT "linker_proposals_linkerId_fkey" FOREIGN KEY ("linkerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linker_proposals" ADD CONSTRAINT "linker_proposals_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_negotiations" ADD CONSTRAINT "proposal_negotiations_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "linker_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "linker_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_evidence" ADD CONSTRAINT "connection_evidence_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_metrics" ADD CONSTRAINT "reputation_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
