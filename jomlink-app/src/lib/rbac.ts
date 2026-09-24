import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminMemberByUserId } from "@/lib/queries";
import type { AdminRole, AdminMemberRow } from "@/lib/jomlink-types";

export type AdminPermission =
  | "members:read"
  | "members:write"
  | "members:suspend"
  | "opportunities:read"
  | "opportunities:moderate"
  | "kyc:read"
  | "kyc:write"
  | "finance:read"
  | "finance:refund"
  | "finance:payout"
  | "disputes:read"
  | "disputes:resolve"
  | "compliance:read"
  | "compliance:write"
  | "audit:read";

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    "members:read",
    "members:write",
    "members:suspend",
    "opportunities:read",
    "opportunities:moderate",
    "kyc:read",
    "kyc:write",
    "finance:read",
    "finance:refund",
    "finance:payout",
    "disputes:read",
    "disputes:resolve",
    "compliance:read",
    "compliance:write",
    "audit:read",
  ],
  OPERATIONS: [
    "members:read",
    "members:write",
    "opportunities:read",
    "opportunities:moderate",
    "kyc:read",
    "disputes:read",
  ],
  KYC: [
    "members:read",
    "kyc:read",
    "kyc:write",
  ],
  FINANCE: [
    "members:read",
    "finance:read",
    "finance:refund",
    "finance:payout",
    "disputes:read",
  ],
  DISPUTE: [
    "members:read",
    "opportunities:read",
    "disputes:read",
    "disputes:resolve",
    "finance:read",
    "finance:refund",
  ],
  COMPLIANCE: [
    "members:read",
    "members:suspend",
    "opportunities:read",
    "opportunities:moderate",
    "kyc:read",
    "compliance:read",
    "compliance:write",
    "audit:read",
  ],
  SUPPORT: [
    "members:read",
    "opportunities:read",
    "kyc:read",
    "disputes:read",
  ],
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Administrator",
  OPERATIONS: "Operations Admin",
  KYC: "KYC / Verification Admin",
  FINANCE: "Finance Admin",
  DISPUTE: "Dispute Administrator",
  COMPLIANCE: "Compliance Admin",
  SUPPORT: "Support Admin",
};

/**
 * Checks whether an admin role and custom permissions grant a specific permission.
 */
export function hasPermission(
  role: AdminRole,
  permission: AdminPermission | string,
  customPermissions: string[] = []
): boolean {
  if (role === "SUPER_ADMIN" || customPermissions.includes("*")) {
    return true;
  }
  if (customPermissions.includes(permission)) {
    return true;
  }
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  return defaults.includes(permission as AdminPermission);
}

export interface CurrentAdminContext {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  adminMember: AdminMemberRow;
  role: AdminRole;
  permissions: string[];
  can: (perm: AdminPermission | string) => boolean;
}

/**
 * Retrieves the current authenticated admin context, or null if the user is not an admin.
 */
export async function getCurrentAdmin(): Promise<CurrentAdminContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const adminMember = await getAdminMemberByUserId(user.id);
  if (!adminMember && user.role !== "ADMIN") {
    return null;
  }

  const role: AdminRole = adminMember?.role ?? "SUPER_ADMIN";
  const permissions = adminMember?.permissions ?? ["*"];

  return {
    user,
    adminMember: adminMember ?? {
      id: "virtual-admin",
      user_id: user.id,
      role,
      permissions,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    },
    role,
    permissions,
    can: (perm: AdminPermission | string) => hasPermission(role, perm, permissions),
  };
}

/**
 * Guard for server components and actions. Redirects to /dashboard if the current
 * user is not authorized or lacks the specified permission.
 */
export async function requireAdmin(
  requiredPermission?: AdminPermission | string
): Promise<CurrentAdminContext> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  if (requiredPermission && !admin.can(requiredPermission)) {
    redirect("/admin");
  }

  return admin;
}

