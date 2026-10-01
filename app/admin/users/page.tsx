import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";

import { UsersView } from "./users-view";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

/**
 * Server-rendered user roster.
 *
 * Read straight from the data layer instead of over the admin API: the layout has
 * already established that the caller is an administrator, so this needs no
 * second round trip and no client-side fetch during streaming SSR.
 */
export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([getCurrentSession(), listUsers()]);

  return (
    <UsersView
      users={users}
      selfId={session?.user.id ?? null}
      total={users.length}
      adminCount={users.filter((user) => user.role === "admin").length}
      activeCount={users.filter((user) => user.isActive).length}
    />
  );
}