import "server-only";

import { isValidObjectId } from "@/lib/analytics";
import { revokeAllSessions, toPublicUser } from "@/lib/auth";
import { getConnection } from "@/lib/mongodb";
import { Session, type SessionRecord } from "@/models/Session";
import { User, type UserRecord } from "@/models/User";
import type { AdminUserRow, PublicUser, UserRole } from "@/types/auth";

/**
 * Admin user management.
 *
 * Every mutation is guarded against locking the installation out: the last
 * active admin cannot be demoted, deactivated or deleted.
 */

export async function listUsers(): Promise<AdminUserRow[]> {
  await getConnection();

  const rows = await User.find({})
    .sort({ createdAt: -1 })
    .lean<UserRecord[]>()
    .exec();

  if (rows.length === 0) return [];

  const sessionCounts = await Session.aggregate<{ _id: unknown; total: number }>([
    { $match: { userId: { $in: rows.map((row) => row._id) } } },
    { $group: { _id: "$userId", total: { $sum: 1 } } },
  ])
    .exec();

  const counts = new Map(
    sessionCounts.map((entry) => [String(entry._id), entry.total]),
  );

  return rows.map((row) => ({
    ...toPublicUser(row),
    sessionCount: counts.get(String(row._id)) ?? 0,
  }));
}

/** How many active admins exist, optionally excluding one account. */
export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  await getConnection();

  const filter: Record<string, unknown> = { role: "admin", isActive: true };

  if (excludeUserId && isValidObjectId(excludeUserId)) {
    filter._id = { $ne: excludeUserId };
  }

  return User.countDocuments(filter);
}

/**
 * Whether removing admin rights from this account would leave none behind.
 *
 * Only meaningful when the account is currently an *active* admin.
 */
async function wouldOrphanAdmins(user: UserRecord): Promise<boolean> {
  if (user.role !== "admin" || user.isActive === false) return false;
  return (await countActiveAdmins(String(user._id))) === 0;
}

type MutationFailure = "NOT_FOUND" | "LAST_ADMIN";

type MutationResult<T> = T | { error: MutationFailure };

async function findUser(userId: string): Promise<UserRecord | null> {
  if (!isValidObjectId(userId)) return null;

  await getConnection();
  return User.findById(userId).lean<UserRecord>().exec();
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<MutationResult<{ user: PublicUser }>> {
  const user = await findUser(userId);
  if (!user) return { error: "NOT_FOUND" };

  if (user.role === "admin" && role !== "admin" && (await wouldOrphanAdmins(user))) {
    return { error: "LAST_ADMIN" };
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
    .lean<UserRecord>()
    .exec();

  return { user: toPublicUser(updated as UserRecord) };
}

/** Activates or deactivates an account. Deactivation also revokes its sessions. */
export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<MutationResult<{ user: PublicUser }>> {
  const user = await findUser(userId);
  if (!user) return { error: "NOT_FOUND" };

  if (!isActive && (await wouldOrphanAdmins(user))) {
    return { error: "LAST_ADMIN" };
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: { isActive } }, { new: true })
    .lean<UserRecord>()
    .exec();

  // A deactivated account must lose access immediately, not at token expiry.
  if (!isActive) await revokeAllSessions(userId);

  return { user: toPublicUser(updated as UserRecord) };
}

/** Deletes an account and every session it owns. */
export async function deleteUser(userId: string): Promise<MutationResult<{ deleted: true }>> {
  const user = await findUser(userId);
  if (!user) return { error: "NOT_FOUND" };

  if (await wouldOrphanAdmins(user)) return { error: "LAST_ADMIN" };

  await revokeAllSessions(userId);
  await User.deleteOne({ _id: userId }).exec();

  return { deleted: true };
}

/** Revokes every session for one account ("sign out everywhere"). */
export async function revokeUserSessions(userId: string): Promise<MutationResult<{ revoked: number }>> {
  if (!isValidUserId(userId)) return { error: "NOT_FOUND" };
  return { revoked: await revokeAllSessions(userId) };
}

function isValidUserId(userId: string): boolean {
  return isValidObjectId(userId);
}

export type { SessionRecord };