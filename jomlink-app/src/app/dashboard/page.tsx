import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Cable,
  Coins,
  FileText,
  Handshake,
  Inbox,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunitiesBySeeker,
  getProposalsByLinkerWithOpportunity,
  getProposalsForSeeker,
  getConnectionsByUser,
  getConnectionsForSeeker,
  getTransactionsByUser,
  getPayoutsByRecipient,
  getMemberReputation,
  getUnreadNotificationCount,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatMYR, OPPORTUNITY_STATUS_LABELS } from "@/lib/constants";
import type {
  OpportunityRow,
  ConnectionRow,
  LinkerProposalRow,
  TransactionRow,
} from "@/lib/jomlink-types";

export const metadata = {
  title: "Dashboard · Jomlink",
  description:
    "Your Jomlink hub: opportunities, proposals, connections, earnings and escrow at a glance.",
};

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SELECTED: "Selected",
  COMPLETED: "Completed",
};

const CONNECTION_STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
};

function statusVariant(status: string) {
  if (status === "COMPLETED" || status === "SELECTED" || status === "ACTIVE") return "success";
  if (status === "DISPUTED" || status === "FAILED" || status === "REJECTED") return "destructive";
  if (status === "PENDING_PAYMENT" || status === "AWAITING_VERIFICATION") return "warning";
  return "secondary";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout redirects

  const isSeeker = user.role === "SEEKER" || user.role === "BOTH" || user.role === "ADMIN";
  const isLinker = user.role === "LINKER" || user.role === "BOTH" || user.role === "ADMIN";

  const [
    myOpportunities,
    proposalsReceived,
    myProposals,
    seekerConnections,
    linkerConnections,
    transactions,
    payouts,
    reputation,
    unreadNotifications,
  ] = await Promise.all([
    isSeeker ? getOpportunitiesBySeeker(user.id) : Promise.resolve([]),
    isSeeker ? getProposalsForSeeker(user.id) : Promise.resolve([]),
    isLinker ? getProposalsByLinkerWithOpportunity(user.id) : Promise.resolve([]),
    isSeeker ? getConnectionsForSeeker(user.id) : Promise.resolve([]),
    isLinker ? getConnectionsByUser(user.id) : Promise.resolve([]),
    getTransactionsByUser(user.id),
    getPayoutsByRecipient(user.id),
    getMemberReputation(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  const initial = (user.fullName || "U").charAt(0).toUpperCase();

  const activeOpportunities = myOpportunities.filter((o: OpportunityRow) =>
    ["ACTIVE", "PROPOSAL_RECEIVED", "NEGOTIATION", "LINKER_SELECTED", "IN_PROGRESS"].includes(o.status)
  );
  const openProposals = proposalsReceived.filter((p: LinkerProposalRow) =>
    ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"].includes(p.status)
  );
  const activeConnections = [...seekerConnections, ...linkerConnections].filter(
    (c: ConnectionRow) => !["COMPLETED", "FAILED"].includes(c.status)
  );

  const earnings = payouts.reduce(
    (sum: number, p: { net_amount: number | null }) => sum + Number(p.net_amount || 0),
    0
  );
  const escrowHeld = transactions
    .filter((t: TransactionRow) => t.type === "OPPORTUNITY_FUNDING" && t.status === "COMPLETED")
    .reduce((sum: number, t: TransactionRow) => sum + Number(t.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isSeeker && isLinker
              ? "Manage your opportunities, proposals and connections."
              : isSeeker
              ? "Track the opportunities you have posted and the proposals you receive."
              : "Find opportunities to apply for and track your introductions."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/marketplace">Browse Opportunities</Link>
          </Button>
          {isSeeker && (
            <Button asChild>
              <Link href="/opportunities/new">
                Post an Opportunity <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="brand-band px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{user.fullName}</h2>
                {user.profile?.verifiedBadge && (
                  <Badge variant="verified" className="gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                  </Badge>
                )}
              </div>
              <p className="truncate text-white/80">
                {user.profile?.headline ?? user.email}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <StatCard
            icon={Briefcase}
            label="Active Opportunities"
            value={activeOpportunities.length}
          />
          <StatCard
            icon={Inbox}
            label="Open Proposals"
            value={openProposals.length}
          />
          <StatCard
            icon={Cable}
            label="Active Connections"
            value={activeConnections.length}
          />
          <StatCard
            icon={Star}
            label="Reputation"
            value={
              reputation?.average_rating
                ? `${Number(reputation.average_rating).toFixed(1)} ★`
                : "—"
            }
            hint={
              reputation?.success_rate != null
                ? `${Math.round(Number(reputation.success_rate))}% success`
                : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Notifications nudge */}
      {unreadNotifications > 0 && (
        <Card className="border-primary/30 bg-primary-soft/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-medium text-foreground">
              You have {unreadNotifications} unread notification
              {unreadNotifications === 1 ? "" : "s"}.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/notifications">View notifications</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seeker view */}
      {isSeeker && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">My Opportunities</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/opportunities/new">New</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {myOpportunities.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Briefcase className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t posted any opportunities yet.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/opportunities/new">Post an opportunity</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {myOpportunities.slice(0, 5).map((o: OpportunityRow) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/opportunities/${o.id}`}
                          className="truncate text-sm font-semibold hover:text-primary"
                        >
                          {o.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatMYR(o.offer_amount)} · {formatDate(o.created_at)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(o.status)}>
                        {OPPORTUNITY_STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Proposals Received</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/proposals">All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {proposalsReceived.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Inbox className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    No proposals yet. Linkers will apply once your opportunity is active.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {proposalsReceived.slice(0, 5).map((p: LinkerProposalRow) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/opportunities/${p.opportunity_id}/proposals`}
                          className="truncate text-sm font-semibold hover:text-primary"
                        >
                          {formatMYR(p.proposed_reward)} proposal
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDate(p.created_at)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(p.status)}>
                        {PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Linker view */}
      {isLinker && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">My Proposals</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/proposals">All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {myProposals.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t submitted any proposals yet.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/marketplace">Browse opportunities</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {myProposals.slice(0, 5).map((p: LinkerProposalRow & { opportunities?: unknown }) => {
                    const opp = p.opportunities as { title?: string } | null;
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/opportunities/${p.opportunity_id}`}
                            className="truncate text-sm font-semibold hover:text-primary"
                          >
                            {opp?.title ?? "Opportunity"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatMYR(p.proposed_reward)} · {formatDate(p.created_at)}
                          </p>
                        </div>
                        <Badge variant={statusVariant(p.status)}>
                          {PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Earnings</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/wallet">Wallet</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={Coins}
                  label="Net earnings"
                  value={formatMYR(earnings)}
                  tone="success"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Payouts"
                  value={payouts.length}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Payouts release 7 days after a connection is marked complete, unless disputed.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connections + escrow */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Active Connections</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/connections">All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeConnections.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Handshake className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  No active connections right now.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activeConnections.slice(0, 5).map((c: ConnectionRow & { opportunities?: unknown }) => {
                  const opp = c.opportunities as { title?: string } | null;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/connections/${c.id}`}
                          className="truncate text-sm font-semibold hover:text-primary"
                        >
                          {opp?.title ?? "Connection"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Started {formatDate(c.created_at)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(c.status)}>
                        {CONNECTION_STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Escrow &amp; Wallet</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/wallet">Open wallet</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={Wallet}
                label="Funded (escrow)"
                value={formatMYR(escrowHeld)}
              />
              <StatCard
                icon={Coins}
                label="Transactions"
                value={transactions.length}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Funds are held in escrow until the connection completes or a dispute is resolved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}