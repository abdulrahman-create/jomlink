import Link from "next/link";
import { Users, Search, Shield, Ban, CheckCircle, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { listAllMembers } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import {
  suspendMemberAction,
  reinstateMemberAction,
  updateMemberRoleAction,
} from "@/app/actions/admin";
import { RoleSelect } from "./role-select";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const admin = await requireAdmin("members:read");
  const { q, role, status } = await searchParams;

  const members = await listAllMembers({
    search: q,
    role: role ?? "ALL",
    status: status ?? "ALL",
    limit: 50,
  });

  const canSuspend = admin.can("members:suspend");
  const canWrite = admin.can("members:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Member Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, inspect, suspend, and configure platform members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {members.length} members shown
          </Badge>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border-border bg-white shadow-xs">
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by name or email..."
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              name="role"
              defaultValue={role ?? "ALL"}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Roles</option>
              <option value="SEEKER">Seeker</option>
              <option value="LINKER">Linker</option>
              <option value="BOTH">Both</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              name="status"
              defaultValue={status ?? "ALL"}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Filter
            </button>
            {(q || (role && role !== "ALL") || (status && status !== "ALL")) && (
              <Link
                href="/admin/members"
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="border-border bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isSuspended = m.status === "SUSPENDED";
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {m.full_name}
                          <Link
                            href={`/members/${m.id}`}
                            target="_blank"
                            title="View public profile"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {m.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {m.country || "MY"} {m.location ? `· ${m.location}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {isSuspended ? (
                          <Badge variant="destructive" className="text-xs">
                            SUSPENDED
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-xs">
                            ACTIVE
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Role edit */}
                          {canWrite && (
                            <form action={updateMemberRoleAction} className="inline-flex">
                              <input type="hidden" name="userId" value={m.id} />
                              <RoleSelect
                                defaultValue={m.role}
                                className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                              />
                            </form>
                          )}

                          {/* Suspend / Reinstate */}
                          {canSuspend && (
                            isSuspended ? (
                              <form action={reinstateMemberAction} className="inline-flex">
                                <input type="hidden" name="userId" value={m.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
                                >
                                  <CheckCircle className="h-3 w-3" /> Reinstate
                                </button>
                              </form>
                            ) : (
                              <form action={suspendMemberAction} className="inline-flex">
                                <input type="hidden" name="userId" value={m.id} />
                                <input
                                  type="hidden"
                                  name="reason"
                                  value="Account suspended by administrator"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-300"
                                >
                                  <Ban className="h-3 w-3" /> Suspend
                                </button>
                              </form>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

