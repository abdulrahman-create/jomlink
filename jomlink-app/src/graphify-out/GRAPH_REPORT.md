# Graph Report - src  (2026-10-15)

## Corpus Check
- 164 files · ~272,517 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3690 nodes · 5971 edges · 62 communities (59 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `362ecf28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Prisma Users Model|Prisma Users Model]]
- [[_COMMUNITY_Prisma Namespace & Enums|Prisma Namespace & Enums]]
- [[_COMMUNITY_Prisma Opportunities Model|Prisma Opportunities Model]]
- [[_COMMUNITY_Prisma Transactions Model|Prisma Transactions Model]]
- [[_COMMUNITY_Prisma Connections Model|Prisma Connections Model]]
- [[_COMMUNITY_Prisma Proposals Model|Prisma Proposals Model]]
- [[_COMMUNITY_Prisma Common Input Types|Prisma Common Input Types]]
- [[_COMMUNITY_Prisma Relationships Model|Prisma Relationships Model]]
- [[_COMMUNITY_Prisma Reviews Model|Prisma Reviews Model]]
- [[_COMMUNITY_Prisma Member Profiles Model|Prisma Member Profiles Model]]
- [[_COMMUNITY_Prisma Disputes Model|Prisma Disputes Model]]
- [[_COMMUNITY_Prisma Business Profiles Model|Prisma Business Profiles Model]]
- [[_COMMUNITY_Prisma Payouts Model|Prisma Payouts Model]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Connections Pages & Deadlines|Connections Pages & Deadlines]]
- [[_COMMUNITY_Auth & KYC Pages|Auth & KYC Pages]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Auth Actions & Schema|Auth Actions & Schema]]
- [[_COMMUNITY_Negotiation Actions|Negotiation Actions]]
- [[_COMMUNITY_Admin Pages & RBAC UI|Admin Pages & RBAC UI]]
- [[_COMMUNITY_Appointments & Completions|Appointments & Completions]]
- [[_COMMUNITY_Opportunities Actions|Opportunities Actions]]
- [[_COMMUNITY_Relationships & Admin Finance|Relationships & Admin Finance]]
- [[_COMMUNITY_Proposals & Reviews Actions|Proposals & Reviews Actions]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Disputes & Connection Forms|Disputes & Connection Forms]]
- [[_COMMUNITY_Business & Opportunity Pages|Business & Opportunity Pages]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Admin Actions & Payouts|Admin Actions & Payouts]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Payments & ToyyibPay|Payments & ToyyibPay]]
- [[_COMMUNITY_Matching & Row Types|Matching & Row Types]]
- [[_COMMUNITY_Opportunity Forms & Info Pages|Opportunity Forms & Info Pages]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Funding & Refund Actions|Funding & Refund Actions]]
- [[_COMMUNITY_Funding Arithmetic|Funding Arithmetic]]
- [[_COMMUNITY_Progress Reports|Progress Reports]]
- [[_COMMUNITY_Deadline & Progress UI|Deadline & Progress UI]]
- [[_COMMUNITY_Disputes & Notify|Disputes & Notify]]
- [[_COMMUNITY_Notifications & Deep-links|Notifications & Deep-links]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Admin Layout & RBAC|Admin Layout & RBAC]]
- [[_COMMUNITY_Admin KYC & Biometrics|Admin KYC & Biometrics]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]
- [[_COMMUNITY_Reputation|Reputation]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Prisma Generated Models|Prisma Generated Models]]

## God Nodes (most connected - your core abstractions)
1. `sc()` - 149 edges
2. `getCurrentUser` - 111 edges
3. `getOpportunityById()` - 64 edges
4. `getConnectionById()` - 37 edges
5. `Button()` - 35 edges
6. `requireAdmin()` - 33 edges
7. `Card` - 30 edges
8. `CardContent` - 30 edges
9. `formatDate()` - 30 edges
10. `formatMYR()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `markPayoutPaidAction()` --calls--> `updateTransactionStatus()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `moderateOpportunityAction()` --calls--> `getOpportunityById()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `reviewKycAction()` --calls--> `notifyUser()`  [EXTRACTED]
  app/actions/admin.ts → lib/notify.ts
- `reviewKycAction()` --calls--> `getKycRecordById()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts
- `reviewKycAction()` --calls--> `upsertProfile()`  [EXTRACTED]
  app/actions/admin.ts → lib/queries.ts

## Import Cycles
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/reviews.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/notifications.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/payouts.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/member_profiles.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/organisations.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/connection_evidence.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/relationships.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/commonInputTypes.ts -> generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/commonInputTypes.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/admin_members.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/appointments.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/audit_logs.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/business_profiles.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/connections.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/disputes.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/employment_history.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/kyc_records.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/linker_proposals.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/membership.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/opportunities.ts -> generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `generated/prisma/internal/prismaNamespace.ts -> generated/prisma/models.ts -> generated/prisma/models/proposal_negotiations.ts -> generated/prisma/internal/prismaNamespace.ts`

## Communities (62 total, 3 thin omitted)

### Community 0 - "Prisma Users Model"
Cohesion: 0.01
Nodes (208): AggregateUsers, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, EnumRoleFieldUpdateOperationsInput, GetUsersAggregateType, GetUsersGroupByPayload, NullableStringFieldUpdateOperationsInput, Prisma__usersClient (+200 more)

### Community 1 - "Prisma Namespace & Enums"
Cohesion: 0.01
Nodes (170): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Args, At, AtLeast, AtLoose, AtStrict, Audit_logsScalarFieldEnum (+162 more)

### Community 2 - "Prisma Opportunities Model"
Cohesion: 0.01
Nodes (162): AggregateOpportunities, DecimalFieldUpdateOperationsInput, EnumConfidentialityLevelFieldUpdateOperationsInput, EnumCurrencyFieldUpdateOperationsInput, EnumOpportunityCategoryFieldUpdateOperationsInput, EnumOpportunityStatusFieldUpdateOperationsInput, GetOpportunitiesAggregateType, GetOpportunitiesGroupByPayload (+154 more)

### Community 3 - "Prisma Transactions Model"
Cohesion: 0.01
Nodes (152): AggregateTransactions, EnumTransactionStatusFieldUpdateOperationsInput, EnumTransactionTypeFieldUpdateOperationsInput, GetTransactionsAggregateType, GetTransactionsGroupByPayload, Prisma__transactionsClient, transactions$connectionArgs, transactions$ledgerEntriesArgs (+144 more)

### Community 4 - "Prisma Connections Model"
Cohesion: 0.01
Nodes (146): AggregateConnections, connections$appointmentsArgs, connections$disputesArgs, connections$evidenceArgs, connections$transactionsArgs, ConnectionsAggregateArgs, ConnectionsAvgAggregateInputType, ConnectionsAvgAggregateOutputType (+138 more)

### Community 5 - "Prisma Proposals Model"
Cohesion: 0.01
Nodes (139): AggregateLinker_proposals, EnumProposalStatusFieldUpdateOperationsInput, GetLinker_proposalsAggregateType, GetLinker_proposalsGroupByPayload, linker_proposals$connectionsArgs, linker_proposals$negotiationsArgs, linker_proposals$relationshipArgs, Linker_proposalsAggregateArgs (+131 more)

### Community 6 - "Prisma Common Input Types"
Cohesion: 0.02
Nodes (125): BoolFilter, BoolNullableFilter, BoolNullableWithAggregatesFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter (+117 more)

### Community 7 - "Prisma Relationships Model"
Cohesion: 0.02
Nodes (121): AggregateRelationships, EnumConnectionDegreeFieldUpdateOperationsInput, EnumRelationshipCategoryFieldUpdateOperationsInput, EnumRelationshipVisibilityFieldUpdateOperationsInput, GetRelationshipsAggregateType, GetRelationshipsGroupByPayload, Prisma__relationshipsClient, relationships$organisationArgs (+113 more)

### Community 8 - "Prisma Reviews Model"
Cohesion: 0.02
Nodes (112): AggregateReviews, GetReviewsAggregateType, GetReviewsGroupByPayload, IntFieldUpdateOperationsInput, Prisma__reviewsClient, ReviewsAggregateArgs, ReviewsAvgAggregateInputType, ReviewsAvgAggregateOutputType (+104 more)

### Community 9 - "Prisma Member Profiles Model"
Cohesion: 0.02
Nodes (96): AggregateMember_profiles, EnumVerificationStatusFieldUpdateOperationsInput, GetMember_profilesAggregateType, GetMember_profilesGroupByPayload, member_profiles$employmentHistoryArgs, Member_profilesAggregateArgs, Member_profilesAvgAggregateInputType, Member_profilesAvgAggregateOutputType (+88 more)

### Community 10 - "Prisma Disputes Model"
Cohesion: 0.02
Nodes (93): AggregateDisputes, disputes$connectionArgs, DisputesAggregateArgs, DisputesCountAggregateInputType, DisputesCountAggregateOutputType, disputesCountArgs, disputesCountOrderByAggregateInput, disputesCreateArgs (+85 more)

### Community 11 - "Prisma Business Profiles Model"
Cohesion: 0.02
Nodes (92): AggregateBusiness_profiles, business_profiles$opportunitiesArgs, Business_profilesAggregateArgs, Business_profilesCountAggregateInputType, Business_profilesCountAggregateOutputType, business_profilesCountArgs, business_profilesCountOrderByAggregateInput, Business_profilesCountOutputType (+84 more)

### Community 12 - "Prisma Payouts Model"
Cohesion: 0.02
Nodes (81): AggregatePayouts, GetPayoutsAggregateType, GetPayoutsGroupByPayload, PayoutsAggregateArgs, PayoutsAvgAggregateInputType, PayoutsAvgAggregateOutputType, payoutsAvgOrderByAggregateInput, PayoutsCountAggregateInputType (+73 more)

### Community 13 - "Prisma Generated Models"
Cohesion: 0.02
Nodes (81): AggregateProposal_negotiations, GetProposal_negotiationsAggregateType, GetProposal_negotiationsGroupByPayload, Prisma__proposal_negotiationsClient, Proposal_negotiationsAggregateArgs, Proposal_negotiationsAvgAggregateInputType, Proposal_negotiationsAvgAggregateOutputType, proposal_negotiationsAvgOrderByAggregateInput (+73 more)

### Community 14 - "Prisma Generated Models"
Cohesion: 0.02
Nodes (81): AggregateRefunds, GetRefundsAggregateType, GetRefundsGroupByPayload, Prisma__refundsClient, RefundsAggregateArgs, RefundsAvgAggregateInputType, RefundsAvgAggregateOutputType, refundsAvgOrderByAggregateInput (+73 more)

### Community 15 - "Prisma Generated Models"
Cohesion: 0.02
Nodes (81): AggregateTransaction_ledger, GetTransaction_ledgerAggregateType, GetTransaction_ledgerGroupByPayload, Prisma__transaction_ledgerClient, Transaction_ledgerAggregateArgs, Transaction_ledgerAvgAggregateInputType, Transaction_ledgerAvgAggregateOutputType, transaction_ledgerAvgOrderByAggregateInput (+73 more)

### Community 16 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (77): AggregateConnection_evidence, Connection_evidenceAggregateArgs, Connection_evidenceCountAggregateInputType, Connection_evidenceCountAggregateOutputType, connection_evidenceCountArgs, connection_evidenceCountOrderByAggregateInput, connection_evidenceCreateArgs, connection_evidenceCreateInput (+69 more)

### Community 17 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (76): AggregateAppointments, AppointmentsAggregateArgs, AppointmentsCountAggregateInputType, AppointmentsCountAggregateOutputType, appointmentsCountArgs, appointmentsCountOrderByAggregateInput, appointmentsCreateArgs, appointmentsCreateInput (+68 more)

### Community 18 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (76): AggregateAudit_logs, audit_logs$adminArgs, Audit_logsAggregateArgs, Audit_logsCountAggregateInputType, Audit_logsCountAggregateOutputType, audit_logsCountArgs, audit_logsCountOrderByAggregateInput, audit_logsCreateArgs (+68 more)

### Community 19 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (76): AggregateEmployment_history, Employment_historyAggregateArgs, Employment_historyCountAggregateInputType, Employment_historyCountAggregateOutputType, employment_historyCountArgs, employment_historyCountOrderByAggregateInput, employment_historyCreateArgs, employment_historyCreateInput (+68 more)

### Community 20 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (76): AggregateNotifications, EnumNotificationChannelFieldUpdateOperationsInput, GetNotificationsAggregateType, GetNotificationsGroupByPayload, NotificationsAggregateArgs, NotificationsCountAggregateInputType, NotificationsCountAggregateOutputType, notificationsCountArgs (+68 more)

### Community 21 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (75): AggregateKyc_records, GetKyc_recordsAggregateType, GetKyc_recordsGroupByPayload, Kyc_recordsAggregateArgs, Kyc_recordsCountAggregateInputType, Kyc_recordsCountAggregateOutputType, kyc_recordsCountArgs, kyc_recordsCountOrderByAggregateInput (+67 more)

### Community 22 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (75): AggregateMembership, GetMembershipAggregateType, GetMembershipGroupByPayload, MembershipAggregateArgs, MembershipCountAggregateInputType, MembershipCountAggregateOutputType, membershipCountArgs, membershipCountOrderByAggregateInput (+67 more)

### Community 23 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (75): AggregateRelationship_verifications, GetRelationship_verificationsAggregateType, GetRelationship_verificationsGroupByPayload, Prisma__relationship_verificationsClient, Relationship_verificationsAggregateArgs, Relationship_verificationsCountAggregateInputType, Relationship_verificationsCountAggregateOutputType, relationship_verificationsCountArgs (+67 more)

### Community 24 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (75): AggregateReputation_metrics, GetReputation_metricsAggregateType, GetReputation_metricsGroupByPayload, Prisma__reputation_metricsClient, Reputation_metricsAggregateArgs, Reputation_metricsAvgAggregateInputType, Reputation_metricsAvgAggregateOutputType, reputation_metricsAvgOrderByAggregateInput (+67 more)

### Community 25 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (72): AggregateOrganisations, GetOrganisationsAggregateType, GetOrganisationsGroupByPayload, organisations$relationshipsArgs, OrganisationsAggregateArgs, OrganisationsCountAggregateInputType, OrganisationsCountAggregateOutputType, organisationsCountArgs (+64 more)

### Community 26 - "Connections Pages & Deadlines"
Cohesion: 0.06
Nodes (37): BusinessPage(), EditProgressComment(), PostProgressComment(), PostProgressReport(), YellowFlagBanner(), metadata, REPORT_STATUS_LABEL, initialState (+29 more)

### Community 27 - "Auth & KYC Pages"
Cohesion: 0.09
Nodes (40): AuthState, BusinessState, EmploymentState, initialState, initialState, BusinessSection(), initialState, OBJECTIVES (+32 more)

### Community 28 - "Prisma Generated Models"
Cohesion: 0.03
Nodes (57): Admin_membersAggregateArgs, Admin_membersCountAggregateInputType, Admin_membersCountAggregateOutputType, admin_membersCountArgs, admin_membersCountOrderByAggregateInput, admin_membersCreateArgs, admin_membersCreateInput, admin_membersCreateManyAndReturnArgs (+49 more)

### Community 29 - "Auth Actions & Schema"
Cohesion: 0.08
Nodes (37): ensureJomlinkAuthUser(), loginMember(), LoginSchema, logoutMember(), registerMember(), RegisterSchema, ALLOWED_TYPES, BIOMETRIC_TYPES (+29 more)

### Community 30 - "Negotiation Actions"
Cohesion: 0.05
Nodes (94): labelBiometricAction(), markPayoutPaidAction(), moderateOpportunityAction(), reinstateMemberAction(), reviewKycAction(), reviewRelationshipAction(), suspendMemberAction(), toggleRestrictedCategoryAction() (+86 more)

### Community 31 - "Admin Pages & RBAC UI"
Cohesion: 0.11
Nodes (37): AdminAuditLogsPage(), DEADLINE_STATUS_LABEL, metadata, REPORT_STATUS_LABEL, AdminDisputesPage(), RoleSelect(), AdminOpportunitiesPage(), AdminOverviewPage() (+29 more)

### Community 32 - "Appointments & Completions"
Cohesion: 0.14
Nodes (42): proposeAppointmentAction(), acceptExtensionAction(), addDays(), markConnectionCompleteAction(), markConnectionFailedAction(), rejectExtensionAction(), requestExtensionAction(), acceptDeadlineAction() (+34 more)

### Community 33 - "Opportunities Actions"
Cohesion: 0.07
Nodes (43): markAllNotificationsReadAction(), markNotificationReadAction(), openNotificationAction(), updateBankDetailsAction(), addBusinessProfile(), addEmployment(), ALLOWED_TYPES, BasicDetailsSchema (+35 more)

### Community 34 - "Relationships & Admin Finance"
Cohesion: 0.06
Nodes (70): addRelationship(), RelationshipSchema, RelationshipState, removeRelationship(), updateRelationship(), AdminKycPage(), AdminTransactionsPage(), DashboardPage() (+62 more)

### Community 35 - "Proposals & Reviews Actions"
Cohesion: 0.20
Nodes (14): ALLOWED_TYPES, evidenceObjectPath(), EvidenceSchema, EvidenceState, submitEvidenceAction(), ProposalSchema, ProposalState, submitProposalAction() (+6 more)

### Community 36 - "Prisma Generated Models"
Cohesion: 0.06
Nodes (33): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Audit_logsScalarFieldEnum, Business_profilesScalarFieldEnum, Connection_evidenceScalarFieldEnum, ConnectionsScalarFieldEnum, DisputesScalarFieldEnum, Employment_historyScalarFieldEnum (+25 more)

### Community 37 - "Disputes & Connection Forms"
Cohesion: 0.10
Nodes (30): acknowledgeAppointmentAction(), AppointmentSchema, AppointmentState, CompletionState, ReviewSchema, ReviewState, submitReviewAction(), AppointmentActions() (+22 more)

### Community 38 - "Business & Opportunity Pages"
Cohesion: 0.16
Nodes (13): FeesPage(), metadata, HowItWorksPage(), metadata, STEPS, money(), OpportunityEditForm(), toDateInput() (+5 more)

### Community 39 - "Prisma Generated Models"
Cohesion: 0.07
Nodes (26): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+18 more)

### Community 41 - "Prisma Generated Models"
Cohesion: 0.08
Nodes (25): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+17 more)

### Community 42 - "Payments & ToyyibPay"
Cohesion: 0.15
Nodes (24): POST(), GET(), GET(), TransactionRow, creditVerifiedTopUp(), SettleResult, settleTopUp(), findPaymentTransaction() (+16 more)

### Community 43 - "Matching & Row Types"
Cohesion: 0.15
Nodes (21): money(), OpportunityDetailPage(), metadata, OpportunityProposalsPage(), buildMatchInput(), CATEGORY_KEYWORDS, computeMatchScore(), degreeRank() (+13 more)

### Community 44 - "Opportunity Forms & Info Pages"
Cohesion: 0.10
Nodes (24): CLOSED, ConnectionsPage(), metadata, STATUS_LABEL, metadata, metadata, ReceivedProposal, metadata (+16 more)

### Community 45 - "Prisma Generated Models"
Cohesion: 0.10
Nodes (19): AdminRole, AppointmentStatus, ConfidentialityLevel, ConnectionDegree, ConnectionStatus, Currency, DisputeOutcome, DisputeStatus (+11 more)

### Community 46 - "Funding & Refund Actions"
Cohesion: 0.11
Nodes (18): OpportunityState, TransactionState, initialState, PAYMENT_MESSAGES, TopUpForm(), CancelOpportunity(), oppInit, PublishOpportunity() (+10 more)

### Community 47 - "Funding Arithmetic"
Cohesion: 0.24
Nodes (9): categoryValues, createOpportunityAction(), EDITABLE_STATUSES, isEditableStatus(), OpportunitySchema, updateOpportunityAction(), EditOpportunityPage(), createOpportunity() (+1 more)

### Community 48 - "Progress Reports"
Cohesion: 0.24
Nodes (12): CLOSED_STATES, CommentSchema, editProgressCommentAction(), EditSchema, postProgressCommentAction(), postProgressReportAction(), ProgressState, ReportSchema (+4 more)

### Community 50 - "Disputes & Notify"
Cohesion: 0.18
Nodes (14): GET(), daysUntil(), deadlineProximity, NOW, warnDeadlineApproaching(), ConnectionParties, getConnectionParties(), notifyConnectionParties() (+6 more)

### Community 51 - "Notifications & Deep-links"
Cohesion: 0.29
Nodes (6): metadata, NotificationRow, proposalsRoute(), resolveNotificationHref(), toViewerRole(), ViewerRole

### Community 53 - "Landing Page"
Cohesion: 0.09
Nodes (22): metadata, RelationshipsPage(), RelationshipsSection(), ApplyPage(), metadata, ProposalForm(), EDITABLE_STATUSES, metadata (+14 more)

### Community 54 - "Admin Layout & RBAC"
Cohesion: 0.27
Nodes (7): metadata, AdminMemberRow, AdminRole, ADMIN_ROLE_LABELS, AdminPermission, CurrentAdminContext, ROLE_DEFAULT_PERMISSIONS

### Community 57 - "Prisma Generated Models"
Cohesion: 0.29
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 58 - "Reputation"
Cohesion: 0.40
Nodes (4): ReputationRow, recomputeReputation(), ReputationInput, round2()

### Community 60 - "Root Layout & Fonts"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, soraDisplay

### Community 62 - "Prisma Generated Models"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

## Knowledge Gaps
- **3018 isolated node(s):** `initialState`, `initialState`, `AppointmentSchema`, `RegisterSchema`, `LoginSchema` (+3013 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser` connect `Opportunities Actions` to `Appointments & Completions`, `Relationships & Admin Finance`, `Proposals & Reviews Actions`, `Disputes & Connection Forms`, `Matching & Row Types`, `Opportunity Forms & Info Pages`, `Funding & Refund Actions`, `Funding Arithmetic`, `Progress Reports`, `Deadline & Progress UI`, `Notifications & Deep-links`, `Landing Page`, `Admin Layout & RBAC`, `Connections Pages & Deadlines`, `Auth Actions & Schema`, `Negotiation Actions`, `Admin Pages & RBAC UI`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `formatMYR()` connect `Business & Opportunity Pages` to `Appointments & Completions`, `Relationships & Admin Finance`, `Proposals & Reviews Actions`, `Disputes & Connection Forms`, `Opportunity Forms & Info Pages`, `Funding Arithmetic`, `Landing Page`, `Connections Pages & Deadlines`, `Auth & KYC Pages`, `Negotiation Actions`, `Admin Pages & RBAC UI`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `Button()` connect `Auth & KYC Pages` to `Disputes & Connection Forms`, `Business & Opportunity Pages`, `Admin Actions & Payouts`, `Opportunity Forms & Info Pages`, `Funding & Refund Actions`, `Notifications & Deep-links`, `Landing Page`, `Admin KYC & Biometrics`, `Connections Pages & Deadlines`, `Auth Actions & Schema`, `Negotiation Actions`, `Admin Pages & RBAC UI`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `initialState`, `initialState`, `AppointmentSchema` to the rest of the system?**
  _3018 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prisma Users Model` be split into smaller, more focused modules?**
  _Cohesion score 0.009569377990430622 - nodes in this community are weakly interconnected._
- **Should `Prisma Namespace & Enums` be split into smaller, more focused modules?**
  _Cohesion score 0.011695906432748537 - nodes in this community are weakly interconnected._
- **Should `Prisma Opportunities Model` be split into smaller, more focused modules?**
  _Cohesion score 0.012269938650306749 - nodes in this community are weakly interconnected._