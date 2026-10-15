# Graph Report - .  (2026-10-15)

## Corpus Check
- 169 files · ~277,842 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3722 nodes · 5904 edges · 66 communities (65 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Prisma Generated Users Types|Prisma Generated Users Types]]
- [[_COMMUNITY_Prisma Enum Field Refs|Prisma Enum Field Refs]]
- [[_COMMUNITY_Prisma Generated Opportunity Types|Prisma Generated Opportunity Types]]
- [[_COMMUNITY_Prisma Generated Transaction Types|Prisma Generated Transaction Types]]
- [[_COMMUNITY_Prisma Generated Connection Types|Prisma Generated Connection Types]]
- [[_COMMUNITY_Prisma Generated Proposal Types|Prisma Generated Proposal Types]]
- [[_COMMUNITY_Prisma Filter Types|Prisma Filter Types]]
- [[_COMMUNITY_Prisma Generated Relationship Types|Prisma Generated Relationship Types]]
- [[_COMMUNITY_Prisma Generated Review Types|Prisma Generated Review Types]]
- [[_COMMUNITY_Prisma Generated Profile Types|Prisma Generated Profile Types]]
- [[_COMMUNITY_Prisma Generated Dispute Types|Prisma Generated Dispute Types]]
- [[_COMMUNITY_Prisma Generated Business Types|Prisma Generated Business Types]]
- [[_COMMUNITY_Prisma Generated Payout Types|Prisma Generated Payout Types]]
- [[_COMMUNITY_Prisma Negotiation Types|Prisma Negotiation Types]]
- [[_COMMUNITY_Prisma Generated Refund Types|Prisma Generated Refund Types]]
- [[_COMMUNITY_Prisma Ledger Types|Prisma Ledger Types]]
- [[_COMMUNITY_Prisma Generated Evidence Types|Prisma Generated Evidence Types]]
- [[_COMMUNITY_Prisma Generated Appointment Types|Prisma Generated Appointment Types]]
- [[_COMMUNITY_Prisma Generated Audit Log Types|Prisma Generated Audit Log Types]]
- [[_COMMUNITY_Prisma Employment History Types|Prisma Employment History Types]]
- [[_COMMUNITY_Prisma Generated Notification Types|Prisma Generated Notification Types]]
- [[_COMMUNITY_Prisma Generated KYC Types|Prisma Generated KYC Types]]
- [[_COMMUNITY_Prisma Generated Membership Types|Prisma Generated Membership Types]]
- [[_COMMUNITY_Prisma Relationship Verification Types|Prisma Relationship Verification Types]]
- [[_COMMUNITY_Prisma Generated Reputation Types|Prisma Generated Reputation Types]]
- [[_COMMUNITY_Prisma Generated Organisation Types|Prisma Generated Organisation Types]]
- [[_COMMUNITY_Funding, Ledger & Admin Actions|Funding, Ledger & Admin Actions]]
- [[_COMMUNITY_Status Machine, Matching & Negotiation|Status Machine, Matching & Negotiation]]
- [[_COMMUNITY_Query Helpers & Admin Pages|Query Helpers & Admin Pages]]
- [[_COMMUNITY_Prisma Generated Admin Types|Prisma Generated Admin Types]]
- [[_COMMUNITY_Shared UI Cards & Admin Pages|Shared UI Cards & Admin Pages]]
- [[_COMMUNITY_Phase 14 Completion Workflow Core|Phase 14 Completion Workflow Core]]
- [[_COMMUNITY_Profile & Form UI Components|Profile & Form UI Components]]
- [[_COMMUNITY_Marketplace Actions & Headers|Marketplace Actions & Headers]]
- [[_COMMUNITY_Data Layer Types & Reputation|Data Layer Types & Reputation]]
- [[_COMMUNITY_Prisma Scalar Enums & Models|Prisma Scalar Enums & Models]]
- [[_COMMUNITY_Progress Thread & Deadline Actions|Progress Thread & Deadline Actions]]
- [[_COMMUNITY_Member Profile Actions & Storage|Member Profile Actions & Storage]]
- [[_COMMUNITY_Dashboard, Wallet & Connections|Dashboard, Wallet & Connections]]
- [[_COMMUNITY_Landing, Info & Footer Pages|Landing, Info & Footer Pages]]
- [[_COMMUNITY_Escrow Release & Sweeps|Escrow Release & Sweeps]]
- [[_COMMUNITY_ToyyibPay Payments|ToyyibPay Payments]]
- [[_COMMUNITY_Prisma Client Models|Prisma Client Models]]
- [[_COMMUNITY_Prisma Browser Models|Prisma Browser Models]]
- [[_COMMUNITY_Connection Detail UI & Reviews|Connection Detail UI & Reviews]]
- [[_COMMUNITY_Constants, Fees & Public Pages|Constants, Fees & Public Pages]]
- [[_COMMUNITY_UI Primitives, Auth & Chrome|UI Primitives, Auth & Chrome]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]

## God Nodes (most connected - your core abstractions)
1. `sc()` - 151 edges
2. `getCurrentUser` - 90 edges
3. `getOpportunityById()` - 67 edges
4. `getConnectionById()` - 41 edges
5. `requireAdmin()` - 33 edges
6. `Button()` - 32 edges
7. `formatDate()` - 30 edges
8. `formatMYR()` - 29 edges
9. `Card` - 26 edges
10. `CardContent` - 26 edges

## Surprising Connections (you probably didn't know these)
- `AdminLayout()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/admin/layout.tsx → lib/rbac.ts
- `markPayoutPaidAction()` --calls--> `getUserById()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `markPayoutPaidAction()` --calls--> `updateTransactionStatus()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `moderateOpportunityAction()` --calls--> `getOpportunityById()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `reviewKycAction()` --calls--> `getKycRecordById()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts

## Import Cycles
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/relationship_verifications.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/admin_members.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/appointments.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/member_profiles.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/connection_evidence.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/refunds.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/connections.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/audit_logs.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/kyc_records.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/reviews.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/membership.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/disputes.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/proposal_negotiations.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/linker_proposals.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/payouts.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/notifications.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/commonInputTypes.ts -> generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/commonInputTypes.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/business_profiles.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/employment_history.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/opportunities.ts -> generated/prisma/internal/prismaNamespace.ts`

## Communities (66 total, 1 thin omitted)

### Community 0 - "Prisma Generated Users Types"
Cohesion: 0.01
Nodes (208): AggregateUsers, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, EnumRoleFieldUpdateOperationsInput, GetUsersAggregateType, GetUsersGroupByPayload, NullableStringFieldUpdateOperationsInput, Prisma__usersClient (+200 more)

### Community 1 - "Prisma Enum Field Refs"
Cohesion: 0.01
Nodes (170): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Args, At, AtLeast, AtLoose, AtStrict, Audit_logsScalarFieldEnum (+162 more)

### Community 2 - "Prisma Generated Opportunity Types"
Cohesion: 0.01
Nodes (162): AggregateOpportunities, DecimalFieldUpdateOperationsInput, EnumConfidentialityLevelFieldUpdateOperationsInput, EnumCurrencyFieldUpdateOperationsInput, EnumOpportunityCategoryFieldUpdateOperationsInput, EnumOpportunityStatusFieldUpdateOperationsInput, GetOpportunitiesAggregateType, GetOpportunitiesGroupByPayload (+154 more)

### Community 3 - "Prisma Generated Transaction Types"
Cohesion: 0.01
Nodes (152): AggregateTransactions, EnumTransactionStatusFieldUpdateOperationsInput, EnumTransactionTypeFieldUpdateOperationsInput, GetTransactionsAggregateType, GetTransactionsGroupByPayload, Prisma__transactionsClient, transactions$connectionArgs, transactions$ledgerEntriesArgs (+144 more)

### Community 4 - "Prisma Generated Connection Types"
Cohesion: 0.01
Nodes (146): AggregateConnections, connections$appointmentsArgs, connections$disputesArgs, connections$evidenceArgs, connections$transactionsArgs, ConnectionsAggregateArgs, ConnectionsAvgAggregateInputType, ConnectionsAvgAggregateOutputType (+138 more)

### Community 5 - "Prisma Generated Proposal Types"
Cohesion: 0.01
Nodes (139): AggregateLinker_proposals, EnumProposalStatusFieldUpdateOperationsInput, GetLinker_proposalsAggregateType, GetLinker_proposalsGroupByPayload, linker_proposals$connectionsArgs, linker_proposals$negotiationsArgs, linker_proposals$relationshipArgs, Linker_proposalsAggregateArgs (+131 more)

### Community 6 - "Prisma Filter Types"
Cohesion: 0.02
Nodes (125): BoolFilter, BoolNullableFilter, BoolNullableWithAggregatesFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter (+117 more)

### Community 7 - "Prisma Generated Relationship Types"
Cohesion: 0.02
Nodes (121): AggregateRelationships, EnumConnectionDegreeFieldUpdateOperationsInput, EnumRelationshipCategoryFieldUpdateOperationsInput, EnumRelationshipVisibilityFieldUpdateOperationsInput, GetRelationshipsAggregateType, GetRelationshipsGroupByPayload, Prisma__relationshipsClient, relationships$organisationArgs (+113 more)

### Community 8 - "Prisma Generated Review Types"
Cohesion: 0.02
Nodes (112): AggregateReviews, GetReviewsAggregateType, GetReviewsGroupByPayload, IntFieldUpdateOperationsInput, Prisma__reviewsClient, ReviewsAggregateArgs, ReviewsAvgAggregateInputType, ReviewsAvgAggregateOutputType (+104 more)

### Community 9 - "Prisma Generated Profile Types"
Cohesion: 0.02
Nodes (96): AggregateMember_profiles, EnumVerificationStatusFieldUpdateOperationsInput, GetMember_profilesAggregateType, GetMember_profilesGroupByPayload, member_profiles$employmentHistoryArgs, Member_profilesAggregateArgs, Member_profilesAvgAggregateInputType, Member_profilesAvgAggregateOutputType (+88 more)

### Community 10 - "Prisma Generated Dispute Types"
Cohesion: 0.02
Nodes (93): AggregateDisputes, disputes$connectionArgs, DisputesAggregateArgs, DisputesCountAggregateInputType, DisputesCountAggregateOutputType, disputesCountArgs, disputesCountOrderByAggregateInput, disputesCreateArgs (+85 more)

### Community 11 - "Prisma Generated Business Types"
Cohesion: 0.02
Nodes (92): AggregateBusiness_profiles, business_profiles$opportunitiesArgs, Business_profilesAggregateArgs, Business_profilesCountAggregateInputType, Business_profilesCountAggregateOutputType, business_profilesCountArgs, business_profilesCountOrderByAggregateInput, Business_profilesCountOutputType (+84 more)

### Community 12 - "Prisma Generated Payout Types"
Cohesion: 0.02
Nodes (81): AggregatePayouts, GetPayoutsAggregateType, GetPayoutsGroupByPayload, PayoutsAggregateArgs, PayoutsAvgAggregateInputType, PayoutsAvgAggregateOutputType, payoutsAvgOrderByAggregateInput, PayoutsCountAggregateInputType (+73 more)

### Community 13 - "Prisma Negotiation Types"
Cohesion: 0.02
Nodes (81): AggregateProposal_negotiations, GetProposal_negotiationsAggregateType, GetProposal_negotiationsGroupByPayload, Prisma__proposal_negotiationsClient, Proposal_negotiationsAggregateArgs, Proposal_negotiationsAvgAggregateInputType, Proposal_negotiationsAvgAggregateOutputType, proposal_negotiationsAvgOrderByAggregateInput (+73 more)

### Community 14 - "Prisma Generated Refund Types"
Cohesion: 0.02
Nodes (81): AggregateRefunds, GetRefundsAggregateType, GetRefundsGroupByPayload, Prisma__refundsClient, RefundsAggregateArgs, RefundsAvgAggregateInputType, RefundsAvgAggregateOutputType, refundsAvgOrderByAggregateInput (+73 more)

### Community 15 - "Prisma Ledger Types"
Cohesion: 0.02
Nodes (81): AggregateTransaction_ledger, GetTransaction_ledgerAggregateType, GetTransaction_ledgerGroupByPayload, Prisma__transaction_ledgerClient, Transaction_ledgerAggregateArgs, Transaction_ledgerAvgAggregateInputType, Transaction_ledgerAvgAggregateOutputType, transaction_ledgerAvgOrderByAggregateInput (+73 more)

### Community 16 - "Prisma Generated Evidence Types"
Cohesion: 0.03
Nodes (77): AggregateConnection_evidence, Connection_evidenceAggregateArgs, Connection_evidenceCountAggregateInputType, Connection_evidenceCountAggregateOutputType, connection_evidenceCountArgs, connection_evidenceCountOrderByAggregateInput, connection_evidenceCreateArgs, connection_evidenceCreateInput (+69 more)

### Community 17 - "Prisma Generated Appointment Types"
Cohesion: 0.03
Nodes (76): AggregateAppointments, AppointmentsAggregateArgs, AppointmentsCountAggregateInputType, AppointmentsCountAggregateOutputType, appointmentsCountArgs, appointmentsCountOrderByAggregateInput, appointmentsCreateArgs, appointmentsCreateInput (+68 more)

### Community 18 - "Prisma Generated Audit Log Types"
Cohesion: 0.03
Nodes (76): AggregateAudit_logs, audit_logs$adminArgs, Audit_logsAggregateArgs, Audit_logsCountAggregateInputType, Audit_logsCountAggregateOutputType, audit_logsCountArgs, audit_logsCountOrderByAggregateInput, audit_logsCreateArgs (+68 more)

### Community 19 - "Prisma Employment History Types"
Cohesion: 0.03
Nodes (76): AggregateEmployment_history, Employment_historyAggregateArgs, Employment_historyCountAggregateInputType, Employment_historyCountAggregateOutputType, employment_historyCountArgs, employment_historyCountOrderByAggregateInput, employment_historyCreateArgs, employment_historyCreateInput (+68 more)

### Community 20 - "Prisma Generated Notification Types"
Cohesion: 0.03
Nodes (76): AggregateNotifications, EnumNotificationChannelFieldUpdateOperationsInput, GetNotificationsAggregateType, GetNotificationsGroupByPayload, NotificationsAggregateArgs, NotificationsCountAggregateInputType, NotificationsCountAggregateOutputType, notificationsCountArgs (+68 more)

### Community 21 - "Prisma Generated KYC Types"
Cohesion: 0.03
Nodes (75): AggregateKyc_records, GetKyc_recordsAggregateType, GetKyc_recordsGroupByPayload, Kyc_recordsAggregateArgs, Kyc_recordsCountAggregateInputType, Kyc_recordsCountAggregateOutputType, kyc_recordsCountArgs, kyc_recordsCountOrderByAggregateInput (+67 more)

### Community 22 - "Prisma Generated Membership Types"
Cohesion: 0.03
Nodes (75): AggregateMembership, GetMembershipAggregateType, GetMembershipGroupByPayload, MembershipAggregateArgs, MembershipCountAggregateInputType, MembershipCountAggregateOutputType, membershipCountArgs, membershipCountOrderByAggregateInput (+67 more)

### Community 23 - "Prisma Relationship Verification Types"
Cohesion: 0.03
Nodes (75): AggregateRelationship_verifications, GetRelationship_verificationsAggregateType, GetRelationship_verificationsGroupByPayload, Prisma__relationship_verificationsClient, Relationship_verificationsAggregateArgs, Relationship_verificationsCountAggregateInputType, Relationship_verificationsCountAggregateOutputType, relationship_verificationsCountArgs (+67 more)

### Community 24 - "Prisma Generated Reputation Types"
Cohesion: 0.03
Nodes (75): AggregateReputation_metrics, GetReputation_metricsAggregateType, GetReputation_metricsGroupByPayload, Prisma__reputation_metricsClient, Reputation_metricsAggregateArgs, Reputation_metricsAvgAggregateInputType, Reputation_metricsAvgAggregateOutputType, reputation_metricsAvgOrderByAggregateInput (+67 more)

### Community 25 - "Prisma Generated Organisation Types"
Cohesion: 0.03
Nodes (72): AggregateOrganisations, GetOrganisationsAggregateType, GetOrganisationsGroupByPayload, organisations$relationshipsArgs, OrganisationsAggregateArgs, OrganisationsCountAggregateInputType, OrganisationsCountAggregateOutputType, organisationsCountArgs (+64 more)

### Community 26 - "Funding, Ledger & Admin Actions"
Cohesion: 0.08
Nodes (60): labelBiometricAction(), markPayoutPaidAction(), moderateOpportunityAction(), reinstateMemberAction(), reviewKycAction(), reviewRelationshipAction(), suspendMemberAction(), toggleRestrictedCategoryAction() (+52 more)

### Community 27 - "Status Machine, Matching & Negotiation"
Cohesion: 0.06
Nodes (57): acceptTermsAction(), counterOfferAction(), CounterSchema, NegotiationState, selectLinkerAction(), GET(), metadata, initialState (+49 more)

### Community 28 - "Query Helpers & Admin Pages"
Cohesion: 0.07
Nodes (65): addRelationship(), RelationshipSchema, RelationshipState, removeRelationship(), updateRelationship(), AdminDisputeDetailPage(), AdminKycPage(), AdminTransactionsPage() (+57 more)

### Community 29 - "Prisma Generated Admin Types"
Cohesion: 0.03
Nodes (57): Admin_membersAggregateArgs, Admin_membersCountAggregateInputType, Admin_membersCountAggregateOutputType, admin_membersCountArgs, admin_membersCountOrderByAggregateInput, admin_membersCreateArgs, admin_membersCreateInput, admin_membersCreateManyAndReturnArgs (+49 more)

### Community 30 - "Shared UI Cards & Admin Pages"
Cohesion: 0.12
Nodes (34): AdminAuditLogsPage(), AdminDisputesPage(), RoleSelect(), AdminOpportunitiesPage(), AdminOverviewPage(), metadata, metadata, STATUS_BADGE (+26 more)

### Community 31 - "Phase 14 Completion Workflow Core"
Cohesion: 0.14
Nodes (44): proposeAppointmentAction(), acceptExtensionAction(), addDays(), confirmEvidenceAction(), markConnectionFailedAction(), rejectExtensionAction(), requestExtensionAction(), verifyCompletionAction() (+36 more)

### Community 32 - "Profile & Form UI Components"
Cohesion: 0.09
Nodes (32): KycState, initialState, BusinessSection(), initialState, OBJECTIVES, ROLE, DOCUMENT_OPTIONS, initialState (+24 more)

### Community 33 - "Marketplace Actions & Headers"
Cohesion: 0.08
Nodes (38): markAllNotificationsReadAction(), markNotificationReadAction(), openNotificationAction(), categoryValues, createOpportunityAction(), EDITABLE_STATUSES, isEditableStatus(), OpportunitySchema (+30 more)

### Community 34 - "Data Layer Types & Reputation"
Cohesion: 0.06
Nodes (34): DEADLINE_STATUS_LABEL, metadata, REPORT_STATUS_LABEL, AppointmentRow, AuditLogRow, BiometricLabelStatus, ConnectionExtensionRow, DeadlineStatus (+26 more)

### Community 35 - "Prisma Scalar Enums & Models"
Cohesion: 0.06
Nodes (33): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Audit_logsScalarFieldEnum, Business_profilesScalarFieldEnum, Connection_evidenceScalarFieldEnum, ConnectionsScalarFieldEnum, DisputesScalarFieldEnum, Employment_historyScalarFieldEnum (+25 more)

### Community 36 - "Progress Thread & Deadline Actions"
Cohesion: 0.10
Nodes (26): DeadlineState, CLOSED_STATES, CommentSchema, editProgressCommentAction(), EditSchema, postProgressCommentAction(), postProgressReportAction(), ProgressState (+18 more)

### Community 37 - "Member Profile Actions & Storage"
Cohesion: 0.09
Nodes (30): addBusinessProfile(), addEmployment(), ALLOWED_TYPES, BasicDetailsSchema, BasicDetailsState, BusinessSchema, BusinessState, EmploymentSchema (+22 more)

### Community 38 - "Dashboard, Wallet & Connections"
Cohesion: 0.12
Nodes (26): CLOSED, ConnectionsPage(), metadata, STATUS_LABEL, DashboardPage(), metadata, MyProposalsPage(), metadata (+18 more)

### Community 39 - "Landing, Info & Footer Pages"
Cohesion: 0.09
Nodes (18): MarketplacePage(), metadata, BLUEPRINT_BENEFITS, CATEGORY_ICONS, CATEGORY_PREVIEWS, PROBLEMS, STEPS, TESTIMONIALS (+10 more)

### Community 40 - "Escrow Release & Sweeps"
Cohesion: 0.12
Nodes (18): cancelOpportunityAction(), refundOpportunityAction(), releaseRewardAction(), runAutoReleaseCheck(), runVerificationSweep(), topUpWalletAction(), TransactionState, GET() (+10 more)

### Community 41 - "ToyyibPay Payments"
Cohesion: 0.16
Nodes (23): POST(), GET(), GET(), creditVerifiedTopUp(), SettleResult, settleTopUp(), findPaymentTransaction(), getPendingTopUpTransactions() (+15 more)

### Community 42 - "Prisma Client Models"
Cohesion: 0.07
Nodes (26): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+18 more)

### Community 43 - "Prisma Browser Models"
Cohesion: 0.08
Nodes (25): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+17 more)

### Community 44 - "Connection Detail UI & Reviews"
Cohesion: 0.13
Nodes (21): CompletionState, ReviewSchema, ReviewState, submitReviewAction(), AppointmentActions(), CompleteConnection(), emptyAppt, ExtensionDecision() (+13 more)

### Community 45 - "Constants, Fees & Public Pages"
Cohesion: 0.13
Nodes (18): OpportunityState, initialState, PAYMENT_MESSAGES, FeesPage(), metadata, HowItWorksPage(), metadata, STEPS (+10 more)

### Community 46 - "UI Primitives, Auth & Chrome"
Cohesion: 0.18
Nodes (10): AuthState, MarkPayoutPaidButton(), initialState, Logo(), NAV_LINKS, StatCard(), Button(), ButtonProps (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (19): AdminRole, AppointmentStatus, ConfidentialityLevel, ConnectionDegree, ConnectionStatus, Currency, DisputeOutcome, DisputeStatus (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (15): ALLOWED_TYPES, BIOMETRIC_TYPES, biometricObjectPath(), DOCUMENT_TYPES, kycObjectPath(), KycSchema, submitKycAction(), submitKycBiometricAction() (+7 more)

### Community 49 - "Community 49"
Cohesion: 0.23
Nodes (11): GET(), GET(), GET(), DashboardLayout(), metadata, NAV, getEvidenceById(), getKycBiometricById() (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (10): ensureJomlinkAuthUser(), loginMember(), LoginSchema, logoutMember(), registerMember(), RegisterSchema, CurrentUser, isJomlinkAuthUser() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.24
Nodes (8): AdminLayout(), metadata, AdminMemberRow, AdminRole, ADMIN_ROLE_LABELS, AdminPermission, CurrentAdminContext, ROLE_DEFAULT_PERMISSIONS

### Community 52 - "Community 52"
Cohesion: 0.29
Nodes (6): metadata, NotificationsPage(), proposalsRoute(), resolveNotificationHref(), toViewerRole(), ViewerRole

### Community 53 - "Community 53"
Cohesion: 0.27
Nodes (9): clearMissedCommitmentFlag(), FLAG_STATUS_CLEARED, FLAG_STATUS_RAISED, FLAG_TYPE, fmt(), raiseMissedCommitmentFlag(), createLinkerFlag(), getActiveFlagByConnection() (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (9): EDITABLE_STATUSES, LINKER_COMMITTED_STATUSES, metadata, money(), OpportunityDetailPage(), PROPOSAL_STATUS_LABEL, STATUS_LABEL, LinkerProposalRow (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.36
Nodes (5): GET(), daysUntil(), deadlineProximity, NOW, listDeadlinesApproaching()

### Community 56 - "Community 56"
Cohesion: 0.36
Nodes (5): isHighRisk(), RiskLevel, scoreCompletionRisk(), VerificationInput, VerificationResult

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (3): BiometricKycForm(), Capture, initialState

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 59 - "Community 59"
Cohesion: 0.47
Nodes (5): acknowledgeAppointmentAction(), AppointmentSchema, AppointmentState, getAppointmentById(), updateAppointment()

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, soraDisplay

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

## Knowledge Gaps
- **3029 isolated node(s):** `initialState`, `initialState`, `AppointmentSchema`, `AppointmentState`, `RegisterSchema` (+3024 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser` connect `Marketplace Actions & Headers` to `Progress Thread & Deadline Actions`, `Member Profile Actions & Storage`, `Dashboard, Wallet & Connections`, `Community 59`, `Connection Detail UI & Reviews`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Funding, Ledger & Admin Actions`, `Status Machine, Matching & Negotiation`, `Query Helpers & Admin Pages`, `Shared UI Cards & Admin Pages`, `Phase 14 Completion Workflow Core`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `Button()` connect `UI Primitives, Auth & Chrome` to `Profile & Form UI Components`, `Progress Thread & Deadline Actions`, `Dashboard, Wallet & Connections`, `Landing, Info & Footer Pages`, `Escrow Release & Sweeps`, `Constants, Fees & Public Pages`, `Community 52`, `Community 57`, `Funding, Ledger & Admin Actions`, `Status Machine, Matching & Negotiation`, `Shared UI Cards & Admin Pages`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `getOpportunityById()` connect `Phase 14 Completion Workflow Core` to `Marketplace Actions & Headers`, `Progress Thread & Deadline Actions`, `Escrow Release & Sweeps`, `Community 59`, `Connection Detail UI & Reviews`, `Community 49`, `Community 53`, `Community 54`, `Funding, Ledger & Admin Actions`, `Status Machine, Matching & Negotiation`, `Query Helpers & Admin Pages`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `initialState`, `initialState`, `AppointmentSchema` to the rest of the system?**
  _3029 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prisma Generated Users Types` be split into smaller, more focused modules?**
  _Cohesion score 0.009569377990430622 - nodes in this community are weakly interconnected._
- **Should `Prisma Enum Field Refs` be split into smaller, more focused modules?**
  _Cohesion score 0.011695906432748537 - nodes in this community are weakly interconnected._
- **Should `Prisma Generated Opportunity Types` be split into smaller, more focused modules?**
  _Cohesion score 0.012269938650306749 - nodes in this community are weakly interconnected._