import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionsByUser } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";
import type { ConnectionRow } from "@/lib/jomlink-types";

export const metadata = { title: "Connections · Jomlink" };

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
};

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const connections = await getConnectionsByUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="mt-1 text-muted-foreground">
          Active and past introductions you are involved in.
        </p>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Handshake className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              No connections yet. They appear once a Seeker selects your proposal.
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((c: ConnectionRow & { opportunities?: unknown }) => {
            const opp = c.opportunities as
              | { title?: string; status?: string; offer_amount?: number; currency?: string }
              | null;
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="font-semibold">{opp?.title ?? "Opportunity"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Started {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={c.status === "COMPLETED" ? "success" : "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={"/dashboard/connections/" + c.id}>Open</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}