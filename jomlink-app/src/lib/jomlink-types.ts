/**
 * Lightweight row types for rows returned from the `jomlink` schema via
 * supabase-js (snake_case). These replace the Prisma-generated types that the
 * UI previously imported. Keep in sync with supabase/jomlink-schema.sql.
 */

export interface JomlinkUserRow {
  id: string;
  email: string;
  email_verified: boolean;
  mobile: string;
  mobile_verified: boolean;
  full_name: string;
  country: string;
  location: string | null;
  role: "SEEKER" | "LINKER" | "BOTH" | "ADMIN";
  status: string;
  supabase_user_id: string | null;
  app: string;
  created_at: string;
  updated_at: string;
}

export interface MemberProfileRow {
  id: string;
  user_id: string;
  headline: string | null;
  current_position: string | null;
  current_organisation: string | null;
  industry: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  languages: string[];
  years_of_experience: number | null;
  bio: string | null;
  verified_badge: boolean;
  verification_status: string;
  success_rate: number | null;
  average_rating: number | null;
  response_rate: number | null;
}

export interface EmploymentRow {
  id: string;
  profile_id: string;
  organisation: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  description: string | null;
}

export interface BusinessProfileRow {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  description: string | null;
  objectives: string[];
  website: string | null;
}

export interface RelationshipRow {
  id: string;
  user_id: string;
  organisation_id: string | null;
  entity_name: string;
  category: string;
  visibility: string;
  connection_degree: string;
  relevance_note: string | null;
  period_label: string | null;
  verified: boolean;
  verification_status: string;
}

export interface OpportunityRow {
  id: string;
  seeker_id: string;
  business_profile_id: string | null;
  title: string;
  category: string;
  target_entity: string;
  target_role: string | null;
  target_role_exact: boolean;
  purpose: string;
  business_description: string | null;
  required_outcome: string;
  connection_method: string | null;
  acceptable_alternatives: string | null;
  geographic_preference: string | null;
  deadline: string | null;
  offer_amount: number;
  currency: string;
  confidentiality: string;
  additional_requirements: string | null;
  status: string;
  activation_fee: number | null;
  funded_amount: number | null;
  is_restricted_category: boolean;
  match_score: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  connection_id: string | null;
  type: string;
  status: string;
  amount: number;
  fee_raw: number | null;
  currency: string;
  exchange_rate: number | null;
  settlement_amount: number | null;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkerProposalRow {
  id: string;
  opportunity_id: string;
  linker_id: string;
  relationship_id: string | null;
  relationship_declared: string | null;
  proposed_target: string | null;
  proposed_method: string | null;
  proposed_deliverable: string | null;
  proposed_reward: number;
  proposed_deadline: string | null;
  remarks: string | null;
  status: string;
  is_target_substitution: boolean;
  substitution_reason: string | null;
  agreed_reward: number | null;
  agreed_deliverable: string | null;
  agreed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalNegotiationRow {
  id: string;
  proposal_id: string;
  from_role: string | null;
  offered_reward: number;
  message: string | null;
  status: string;
  created_at: string;
}

export interface LedgerEntryRow {
  id: string;
  transaction_id: string;
  account: string;
  debit: number;
  credit: number;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  transaction_id: string;
  recipient_id: string;
  amount: number;
  service_fee: number;
  net_amount: number;
  method: string | null;
  status: string;
  released_at: string | null;
  created_at: string;
}

export interface RefundRow {
  id: string;
  transaction_id: string;
  recipient_id: string;
  amount: number;
  reason: string | null;
  status: string;
  approved_by: string | null;
  created_at: string;
}

export interface ConnectionRow {
  id: string;
  opportunity_id: string;
  proposal_id: string;
  linker_id: string;
  status: string;
  agreed_reward: number | null;
  target_scheduled: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  auto_release_at: string | null;
  release_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRow {
  id: string;
  connection_id: string;
  date: string;
  location: string | null;
  method: string | null;
  target: string | null;
  remarks: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionEvidenceRow {
  id: string;
  connection_id: string;
  type: string;
  description: string | null;
  file_url: string | null;
  file_access_key: string | null;
  approved: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  opportunity_id: string;
  author_id: string;
  subject_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReputationRow {
  id: string;
  user_id: string;
  completed_count: number;
  successful_count: number;
  success_rate: number;
  average_rating: number;
  response_rate: number;
  cancellation_count: number;
  dispute_count: number;
  on_time_count: number;
  created_at: string;
  updated_at: string;
}

export type AdminRole =
  | "SUPER_ADMIN"
  | "OPERATIONS"
  | "KYC"
  | "FINANCE"
  | "DISPUTE"
  | "COMPLIANCE"
  | "SUPPORT";

export interface AdminMemberRow {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: string[];
  mfa_enabled: boolean;
  created_at: string;
}

export interface KycRecordRow {
  id: string;
  user_id: string;
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED" | "SUSPENDED";
  document_type: string | null;
  document_ref: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeRow {
  id: string;
  opportunity_id: string;
  connection_id: string | null;
  raised_by_id: string;
  reason: string;
  description: string | null;
  evidence: string | null;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  outcome: "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED" | "REFUNDED" | "OTHER" | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  admin_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  channel: NotificationChannel;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}
