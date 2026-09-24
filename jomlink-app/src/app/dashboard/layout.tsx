import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  LayoutDashboard,
  LogOut,
  Network,
  User,
  Briefcase,
  Handshake,
  FileText,
  Wallet,
  Cable,
  Bell,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/rbac";
import { Logo } from "@/components/logo";
import { logoutMember } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/relationships", label: "Relationships", icon: Network },
  { href: "/dashboard/business", label: "My Business", icon: Briefcase },
  { href: "/dashboard/proposals", label: "My Proposals", icon: FileText },
  { href: "/dashboard/connections", label: "Connections", icon: Cable },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/marketplace", label: "Marketplace", icon: Handshake },
];

export const metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Show the Admin Portal link based on actual RBAC (admin_members row or
  // role=ADMIN), not just the user role — an admin_members row alone grants access.
  const admin = await getCurrentAdmin();

  const initial = (user.fullName || "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/" />
            <span className="hidden text-sm font-medium text-muted-foreground md:block">
              Member Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user.profile?.verifiedBadge && (
              <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
              </span>
            )}
            {admin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                Admin Portal
              </Link>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {initial}
            </span>
            <form action={logoutMember}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 flex flex-col gap-1" aria-label="Dashboard">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Link>
            ))}
            <div className="mt-6 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Handshake className="h-4 w-4 text-primary" aria-hidden="true" />
                {user.role}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.role === "SEEKER" && "You create opportunities to find connections."}
                {user.role === "LINKER" && "You provide introductions using your network."}
                {user.role === "BOTH" && "You can create opportunities and provide introductions."}
              </p>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Mobile nav — the sidebar is hidden below md, so expose the same links here */}
          <nav
            className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden"
            aria-label="Dashboard sections"
          >
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}