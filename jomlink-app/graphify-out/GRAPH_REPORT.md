# Graph Report - jomlink-app  (2026-09-18)

## Corpus Check
- 120 files · ~223,939 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3433 nodes · 4337 edges · 65 communities (60 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
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
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]

## God Nodes (most connected - your core abstractions)
1. `sc()` - 70 edges
2. `getCurrentUser` - 66 edges
3. `getOpportunityById()` - 29 edges
4. `Button()` - 21 edges
5. `compilerOptions` - 16 edges
6. `Badge()` - 15 edges
7. `Card` - 15 edges
8. `CardContent` - 15 edges
9. `getConnectionById()` - 14 edges
10. `cn()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `proposeAppointmentAction()` --calls--> `getCurrentUser`  [EXTRACTED]
  src/app/actions/appointments.ts → src/lib/auth.ts
- `acknowledgeAppointmentAction()` --calls--> `getCurrentUser`  [EXTRACTED]
  src/app/actions/appointments.ts → src/lib/auth.ts
- `acknowledgeAppointmentAction()` --calls--> `getConnectionById()`  [EXTRACTED]
  src/app/actions/appointments.ts → src/lib/queries.ts
- `acknowledgeAppointmentAction()` --calls--> `getOpportunityById()`  [EXTRACTED]
  src/app/actions/appointments.ts → src/lib/queries.ts
- `markConnectionCompleteAction()` --calls--> `getCurrentUser`  [EXTRACTED]
  src/app/actions/completions.ts → src/lib/auth.ts

## Import Cycles
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/admin_members.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/linker_proposals.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/connection_evidence.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/commonInputTypes.ts -> src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/commonInputTypes.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/appointments.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/audit_logs.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/business_profiles.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/connections.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/disputes.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/employment_history.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/kyc_records.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/member_profiles.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/membership.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/notifications.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/opportunities.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/organisations.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/payouts.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/proposal_negotiations.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/refunds.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/relationship_verifications.ts -> src/generated/prisma/internal/prismaNamespace.ts`

## Communities (65 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (208): AggregateUsers, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, EnumRoleFieldUpdateOperationsInput, GetUsersAggregateType, GetUsersGroupByPayload, NullableStringFieldUpdateOperationsInput, Prisma__usersClient (+200 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (170): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Args, At, AtLeast, AtLoose, AtStrict, Audit_logsScalarFieldEnum (+162 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (162): AggregateOpportunities, DecimalFieldUpdateOperationsInput, EnumConfidentialityLevelFieldUpdateOperationsInput, EnumCurrencyFieldUpdateOperationsInput, EnumOpportunityCategoryFieldUpdateOperationsInput, EnumOpportunityStatusFieldUpdateOperationsInput, GetOpportunitiesAggregateType, GetOpportunitiesGroupByPayload (+154 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (152): AggregateTransactions, EnumTransactionStatusFieldUpdateOperationsInput, EnumTransactionTypeFieldUpdateOperationsInput, GetTransactionsAggregateType, GetTransactionsGroupByPayload, Prisma__transactionsClient, transactions$connectionArgs, transactions$ledgerEntriesArgs (+144 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (146): AggregateConnections, connections$appointmentsArgs, connections$disputesArgs, connections$evidenceArgs, connections$transactionsArgs, ConnectionsAggregateArgs, ConnectionsAvgAggregateInputType, ConnectionsAvgAggregateOutputType (+138 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (139): AggregateLinker_proposals, EnumProposalStatusFieldUpdateOperationsInput, GetLinker_proposalsAggregateType, GetLinker_proposalsGroupByPayload, linker_proposals$connectionsArgs, linker_proposals$negotiationsArgs, linker_proposals$relationshipArgs, Linker_proposalsAggregateArgs (+131 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (125): BoolFilter, BoolNullableFilter, BoolNullableWithAggregatesFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter (+117 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (121): AggregateRelationships, EnumConnectionDegreeFieldUpdateOperationsInput, EnumRelationshipCategoryFieldUpdateOperationsInput, EnumRelationshipVisibilityFieldUpdateOperationsInput, GetRelationshipsAggregateType, GetRelationshipsGroupByPayload, Prisma__relationshipsClient, relationships$organisationArgs (+113 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (112): AggregateReviews, GetReviewsAggregateType, GetReviewsGroupByPayload, IntFieldUpdateOperationsInput, Prisma__reviewsClient, ReviewsAggregateArgs, ReviewsAvgAggregateInputType, ReviewsAvgAggregateOutputType (+104 more)

### Community 9 - "Community 9"
Cohesion: 0.02
Nodes (96): AggregateMember_profiles, EnumVerificationStatusFieldUpdateOperationsInput, GetMember_profilesAggregateType, GetMember_profilesGroupByPayload, member_profiles$employmentHistoryArgs, Member_profilesAggregateArgs, Member_profilesAvgAggregateInputType, Member_profilesAvgAggregateOutputType (+88 more)

### Community 10 - "Community 10"
Cohesion: 0.02
Nodes (93): AggregateDisputes, disputes$connectionArgs, DisputesAggregateArgs, DisputesCountAggregateInputType, DisputesCountAggregateOutputType, disputesCountArgs, disputesCountOrderByAggregateInput, disputesCreateArgs (+85 more)

### Community 11 - "Community 11"
Cohesion: 0.02
Nodes (92): AggregateBusiness_profiles, business_profiles$opportunitiesArgs, Business_profilesAggregateArgs, Business_profilesCountAggregateInputType, Business_profilesCountAggregateOutputType, business_profilesCountArgs, business_profilesCountOrderByAggregateInput, Business_profilesCountOutputType (+84 more)

### Community 12 - "Community 12"
Cohesion: 0.02
Nodes (81): AggregatePayouts, GetPayoutsAggregateType, GetPayoutsGroupByPayload, PayoutsAggregateArgs, PayoutsAvgAggregateInputType, PayoutsAvgAggregateOutputType, payoutsAvgOrderByAggregateInput, PayoutsCountAggregateInputType (+73 more)

### Community 13 - "Community 13"
Cohesion: 0.02
Nodes (81): AggregateProposal_negotiations, GetProposal_negotiationsAggregateType, GetProposal_negotiationsGroupByPayload, Prisma__proposal_negotiationsClient, Proposal_negotiationsAggregateArgs, Proposal_negotiationsAvgAggregateInputType, Proposal_negotiationsAvgAggregateOutputType, proposal_negotiationsAvgOrderByAggregateInput (+73 more)

### Community 14 - "Community 14"
Cohesion: 0.02
Nodes (81): AggregateRefunds, GetRefundsAggregateType, GetRefundsGroupByPayload, Prisma__refundsClient, RefundsAggregateArgs, RefundsAvgAggregateInputType, RefundsAvgAggregateOutputType, refundsAvgOrderByAggregateInput (+73 more)

### Community 15 - "Community 15"
Cohesion: 0.02
Nodes (81): AggregateTransaction_ledger, GetTransaction_ledgerAggregateType, GetTransaction_ledgerGroupByPayload, Prisma__transaction_ledgerClient, Transaction_ledgerAggregateArgs, Transaction_ledgerAvgAggregateInputType, Transaction_ledgerAvgAggregateOutputType, transaction_ledgerAvgOrderByAggregateInput (+73 more)

### Community 16 - "Community 16"
Cohesion: 0.03
Nodes (77): AggregateConnection_evidence, Connection_evidenceAggregateArgs, Connection_evidenceCountAggregateInputType, Connection_evidenceCountAggregateOutputType, connection_evidenceCountArgs, connection_evidenceCountOrderByAggregateInput, connection_evidenceCreateArgs, connection_evidenceCreateInput (+69 more)

### Community 17 - "Community 17"
Cohesion: 0.03
Nodes (76): AggregateAppointments, AppointmentsAggregateArgs, AppointmentsCountAggregateInputType, AppointmentsCountAggregateOutputType, appointmentsCountArgs, appointmentsCountOrderByAggregateInput, appointmentsCreateArgs, appointmentsCreateInput (+68 more)

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (76): AggregateAudit_logs, audit_logs$adminArgs, Audit_logsAggregateArgs, Audit_logsCountAggregateInputType, Audit_logsCountAggregateOutputType, audit_logsCountArgs, audit_logsCountOrderByAggregateInput, audit_logsCreateArgs (+68 more)

### Community 19 - "Community 19"
Cohesion: 0.03
Nodes (76): AggregateEmployment_history, Employment_historyAggregateArgs, Employment_historyCountAggregateInputType, Employment_historyCountAggregateOutputType, employment_historyCountArgs, employment_historyCountOrderByAggregateInput, employment_historyCreateArgs, employment_historyCreateInput (+68 more)

### Community 20 - "Community 20"
Cohesion: 0.03
Nodes (76): AggregateNotifications, EnumNotificationChannelFieldUpdateOperationsInput, GetNotificationsAggregateType, GetNotificationsGroupByPayload, NotificationsAggregateArgs, NotificationsCountAggregateInputType, NotificationsCountAggregateOutputType, notificationsCountArgs (+68 more)

### Community 21 - "Community 21"
Cohesion: 0.03
Nodes (75): AggregateKyc_records, GetKyc_recordsAggregateType, GetKyc_recordsGroupByPayload, Kyc_recordsAggregateArgs, Kyc_recordsCountAggregateInputType, Kyc_recordsCountAggregateOutputType, kyc_recordsCountArgs, kyc_recordsCountOrderByAggregateInput (+67 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (75): AggregateMembership, GetMembershipAggregateType, GetMembershipGroupByPayload, MembershipAggregateArgs, MembershipCountAggregateInputType, MembershipCountAggregateOutputType, membershipCountArgs, membershipCountOrderByAggregateInput (+67 more)

### Community 23 - "Community 23"
Cohesion: 0.03
Nodes (75): AggregateRelationship_verifications, GetRelationship_verificationsAggregateType, GetRelationship_verificationsGroupByPayload, Prisma__relationship_verificationsClient, Relationship_verificationsAggregateArgs, Relationship_verificationsCountAggregateInputType, Relationship_verificationsCountAggregateOutputType, relationship_verificationsCountArgs (+67 more)

### Community 24 - "Community 24"
Cohesion: 0.03
Nodes (75): AggregateReputation_metrics, GetReputation_metricsAggregateType, GetReputation_metricsGroupByPayload, Prisma__reputation_metricsClient, Reputation_metricsAggregateArgs, Reputation_metricsAvgAggregateInputType, Reputation_metricsAvgAggregateOutputType, reputation_metricsAvgOrderByAggregateInput (+67 more)

### Community 25 - "Community 25"
Cohesion: 0.03
Nodes (72): AggregateOrganisations, GetOrganisationsAggregateType, GetOrganisationsGroupByPayload, organisations$relationshipsArgs, OrganisationsAggregateArgs, OrganisationsCountAggregateInputType, OrganisationsCountAggregateOutputType, organisationsCountArgs (+64 more)

### Community 26 - "Community 26"
Cohesion: 0.03
Nodes (57): Admin_membersAggregateArgs, Admin_membersCountAggregateInputType, Admin_membersCountAggregateOutputType, admin_membersCountArgs, admin_membersCountOrderByAggregateInput, admin_membersCreateArgs, admin_membersCreateInput, admin_membersCreateManyAndReturnArgs (+49 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (25): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+17 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (33): AuthState, initialState, initialState, metadata, NAV, initialState, initialState, CATEGORY_LABEL (+25 more)

### Community 29 - "Community 29"
Cohesion: 0.05
Nodes (38): dependencies, bcryptjs, class-variance-authority, clsx, dotenv, lucide-react, next, pg (+30 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (33): Admin_membersScalarFieldEnum, AppointmentsScalarFieldEnum, Audit_logsScalarFieldEnum, Business_profilesScalarFieldEnum, Connection_evidenceScalarFieldEnum, ConnectionsScalarFieldEnum, DisputesScalarFieldEnum, Employment_historyScalarFieldEnum (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (25): admin_members, appointments, audit_logs, business_profiles, connection_evidence, connections, disputes, employment_history (+17 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (16): addBusinessProfile(), BusinessSchema, BusinessState, EmploymentSchema, EmploymentState, ProfileSchema, ProfileState, removeBusinessProfile() (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (58): acknowledgeAppointmentAction(), addEmployment(), removeEmployment(), addRelationship(), RelationshipSchema, RelationshipState, removeRelationship(), updateRelationship() (+50 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (43): metadata, ConnectionsPage(), metadata, STATUS_LABEL, metadata, EmploymentSection(), metadata, ProfileForm() (+35 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (13): ensureJomlinkAuthUser(), loginMember(), LoginSchema, logoutMember(), registerMember(), RegisterSchema, GET(), isJomlinkAuthUser() (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (28): acceptTermsAction(), counterOfferAction(), CounterSchema, NegotiationState, selectLinkerAction(), ProposalSchema, ProposalState, submitProposalAction() (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (30): categoryValues, confirmFundingAction(), createOpportunityAction(), OpportunitySchema, OpportunityState, publishOpportunityAction(), fundOpportunityAction(), refundOpportunityAction() (+22 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (11): Auth flow (Supabase + Prisma), Definition of Done, Files involved, Goals, In scope, Key Implementation Notes, Notes / Risks, Out of scope (later phases) (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (10): Definition of Done, Files involved, Goals, In scope, Key Business Rules (from blueprint §2), Notes / Risks, Out of scope (later phases), Phase 2 — Member Profile + Relationships (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (9): 1. Purpose of This Document, 2. Confirmed Technical Decisions, 3. High-Level Architecture, 4. Phase Roadmap (Build Order), 5. Guiding Rules, 6. Current Project Snapshot, 7. Next Action, 8. Change Log (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Key Business Rules (blueprint §3–4), Out of scope (later phases), Phase 3 — Opportunity Marketplace + Matching, Scope (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Key Business Rules (blueprint §5), Out of scope (later phases), Phase 4 — Linker Proposals + Negotiation, Scope (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Key Business Rules (blueprint §3.9, §10), Out of scope (later phases), Phase 5 — Transactions / Escrow, Scope (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Key Business Rules (blueprint §5), Out of scope (later phases), Phase 6 — Connection Workflow + Trust, Scope (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Key Business Rules (blueprint §9), Out of scope (later phases), Phase 7 — Admin / RBAC + Disputes, Scope (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (9): Definition of Done, Files involved, Goals, In scope, Notes, Out of scope (later phases), Phase 8 — Dashboard + Wallet + Polish, Scope (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

### Community 60 - "Community 60"
Cohesion: 0.11
Nodes (35): AppointmentSchema, AppointmentState, proposeAppointmentAction(), addDays(), CompletionState, markConnectionCompleteAction(), markConnectionFailedAction(), requestExtensionAction() (+27 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (21): metadata, money(), TX_TYPE_LABEL, AppointmentRow, ConnectionEvidenceRow, EmploymentRow, LedgerEntryRow, MemberProfileRow (+13 more)

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (19): AdminRole, AppointmentStatus, ConfidentialityLevel, ConnectionDegree, ConnectionStatus, Currency, DisputeOutcome, DisputeStatus (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (5): adapter, main(), prisma, upsertSupabaseUser(), PrismaClient

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (3): metadata, OpportunityProposalsPage(), getProposalsWithLinker()

## Knowledge Gaps
- **3056 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+3051 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 29` to `Community 31`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _3056 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.009569377990430622 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.011695906432748537 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.012269938650306749 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.013071895424836602 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.013605442176870748 - nodes in this community are weakly interconnected._