import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  Scale,
  Wallet,
  History,
  ArrowLeft,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { requireAdmin, ADMIN_ROLE_LABELS } from "@/lib/rbac";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { logoutMember } from "@/app/actions/auth";

export const metadata = {
  title: "Admin Portal · Jomlink",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  const NAV_ITEMS = [
    {
      href: "/admin",
      label: "Overview",
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      href: "/admin/members",
      label: "Members",
      icon: Users,
      allowed: admin.can("members:read"),
    },
    {
      href: "/admin/opportunities",
      label: "Opportunities",
      icon: Briefcase,
      allowed: admin.can("opportunities:read"),
    },
    {
      href: "/admin/kyc",
      label: "KYC & Verification",
      icon: ShieldCheck,
      allowed: admin.can("kyc:read"),
    },
    {
      href: "/admin/disputes",
      label: "Disputes",
      icon: Scale,
      allowed: admin.can("disputes:read"),
    },
    {
      href: "/admin/transactions",
      label: "Transactions & Escrow",
      icon: Wallet,
      allowed: admin.can("finance:read"),
    },
    {
      href: "/admin/audit-logs",
      label: "Audit Trail",
      icon: History,
      allowed: admin.can("audit:read"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-foreground">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo href="/admin" />
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="font-bold text-sm tracking-wide text-foreground">
                ADMIN PORTAL
              </span>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-semibold">
                {ADMIN_ROLE_LABELS[admin.role] ?? admin.role}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Member Dashboard
            </Link>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold">{admin.user.fullName}</span>
              <span className="text-[11px] text-muted-foreground">{admin.user.email}</span>
            </div>

            <form action={logoutMember}>
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-24 flex flex-col gap-1 rounded-xl border border-border bg-white p-3 shadow-xs" aria-label="Admin Navigation">
            <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Management
            </div>
            {NAV_ITEMS.filter((item) => item.allowed).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                Audit Logging Active
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                All administrative modifications are permanently logged to the tamper-resistant audit trail.
              </p>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

