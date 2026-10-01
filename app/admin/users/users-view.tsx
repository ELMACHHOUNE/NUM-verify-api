"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  ShieldIcon,
  ShieldOffIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeUtc, formatRelativeTime } from "@/lib/analytics-format";
import type { AdminUserRow } from "@/types/auth";

/**
 * User management.
 *
 * Receives the roster as a prop so it renders from the server on first paint.
 * Mutations go through the admin API and then call `router.refresh()`, which
 * re-runs the server component — the roster on screen is always whatever the
 * server currently believes, never optimistic local state.
 *
 * Actions on your own row are disabled: the server refuses to demote, deactivate
 * or delete the signed-in administrator, so a live control would only produce a
 * confusing error.
 */
export function UsersView({
  users,
  selfId,
  total,
  adminCount,
  activeCount,
}: {
  users: AdminUserRow[];
  selfId: string | null;
  total: number;
  adminCount: number;
  activeCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(
    userId: string,
    run: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusyId(userId);
    setError(null);
    try {
      const result = await run();
      if (!result.ok) {
        setError(result.error ?? "That change could not be applied.");
        return;
      }
      router.refresh();
    } catch {
      setError("That change could not be applied.");
    } finally {
      setBusyId(null);
    }
  }

  function patchUser(userId: string, patch: Record<string, unknown>) {
    return mutate(userId, async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await response.json()) as { error?: string };
      return { ok: response.ok, error: body.error };
    });
  }

  function deleteUser(userId: string, email: string) {
    if (!confirm(`Delete ${email}? This also signs the account out everywhere.`)) return;

    return mutate(userId, async () => {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      return { ok: response.ok, error: body.error };
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Users</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {total} accounts · {adminCount} admins · {activeCount} active. Administrators can
          see all analytics.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Card>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="sr-only">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No accounts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === selfId;
                    const isBusy = busyId === user.id;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <span className="block font-medium">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className="gap-1"
                          >
                            {user.role === "admin" ? (
                              <ShieldIcon className="size-3" aria-hidden="true" />
                            ) : null}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <UserCheckIcon
                                className="size-3.5 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                              />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <UserXIcon className="size-3.5" aria-hidden="true" />
                              Deactivated
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {user.sessionCount}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTimeUtc(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Manage ${user.email}`}
                                disabled={isBusy}
                              >
                                {isBusy ? (
                                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <MoreHorizontalIcon aria-hidden="true" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {user.role === "admin" ? (
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onSelect={() => void patchUser(user.id, { role: "user" })}
                                >
                                  <ShieldOffIcon aria-hidden="true" />
                                  Make a regular user
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => void patchUser(user.id, { role: "admin" })}
                                >
                                  <ShieldIcon aria-hidden="true" />
                                  Grant admin
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                disabled={isSelf}
                                onSelect={() =>
                                  void patchUser(user.id, { isActive: !user.isActive })
                                }
                              >
                                {user.isActive ? (
                                  <>
                                    <UserXIcon aria-hidden="true" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheckIcon aria-hidden="true" />
                                    Reactivate
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                variant="destructive"
                                onSelect={() => void deleteUser(user.id, user.email)}
                              >
                                <Trash2Icon aria-hidden="true" />
                                Delete account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Deactivating an account revokes its sessions immediately. The last active
        administrator cannot be demoted, deactivated or deleted.
      </p>
    </div>
  );
}