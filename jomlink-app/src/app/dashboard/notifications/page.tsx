import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
  Handshake,
  Info,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/rbac";
import { getNotificationsByUser } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";
import {
  resolveNotificationHref,
  toViewerRole,
} from "@/lib/notification-links";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/app/actions/notifications";
import type { NotificationRow } from "@/lib/jomlink-types";

export const metadata = { title: "Notifications · Jomlink" };

/** Maps a notification type to an icon + tone for quick scanning. */
function iconForType(type: string) {
  if (type.startsWith("DISPUTE")) return { Icon: Scale, tone: "text-destructive" };
  if (type.startsWith("PAYOUT") || type.startsWith("REFUND") || type.startsWith("TRANSACTION"))
    return { Icon: Wallet, tone: "text-success" };
  if (type.startsWith("ADMIN_MEMBER") || type.startsWith("ADMIN_KYC") || type.startsWith("ADMIN_RELATIONSHIP"))
    return { Icon: ShieldCheck, tone: "text-primary" };
  if (
    type.startsWith("CONNECTION") ||
    type.startsWith("PROPOSAL") ||
    type.startsWith("EVIDENCE") ||
    type.startsWith("DEADLINE") ||
    type.startsWith("PROGRESS") ||
    type.startsWith("NEGOTIATION") ||
    type.startsWith("ADMIN_OPPORTUNITY")
  )
    return { Icon: Handshake, tone: "text-primary" };
  return { Icon: Info, tone: "text-muted-foreground" };
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await getNotificationsByUser(user.id);
  const unread = notifications.filter((n: NotificationRow) => !n.read);

  // Deep links are role-relative (a Linker and a Seeker reach the same proposal
  // through different pages), so resolve the viewer's role once here.
  const admin = await getCurrentAdmin();
  const role = toViewerRole(user.role, !!admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Key events about your opportunities, proposals, connections and payments.
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">You have no notifications yet.</p>
            <Button asChild>
              <Link href="/marketplace">Browse opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: NotificationRow) => {
            const { Icon, tone } = iconForType(n.type);
            const href = resolveNotificationHref(n, role);

            const card = (
              <Card
                className={
                  n.read
                    ? href
                      ? "transition-colors group-hover:border-primary/40"
                      : undefined
                    : href
                      ? "border-primary/30 bg-primary-soft/30 transition-colors group-hover:border-primary/50"
                      : "border-primary/30 bg-primary-soft/30"
                }
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="mt-0.5 shrink-0">
                    {n.read ? (
                      <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
                    ) : (
                      <BellRing className={`h-5 w-5 ${tone}`} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{n.title}</p>
                      {!n.read && <Badge variant="default">New</Badge>}
                    </div>
                    {n.body && (
                      <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  {(href || !n.read) && (
                    <div className="flex shrink-0 items-center gap-1">
                      {!n.read && (
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          className="pointer-events-none inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground"
                        >
                          Mark read
                        </span>
                      )}
                      {href && (
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            // Notifications that point somewhere become a single form: the click
            // marks the row read *and* navigates, so the badge never survives the
            // visit. Rows with no destination stay inert.
            return href ? (
              <form key={n.id} action={openNotificationAction} className="group block">
                <input type="hidden" name="notificationId" value={n.id} />
                <input type="hidden" name="href" value={href} />
                <button type="submit" className="w-full text-left">
                  {card}
                </button>
              </form>
            ) : (
              <div key={n.id}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
