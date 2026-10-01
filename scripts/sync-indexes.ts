/**
 * Reconciles MongoDB indexes with the Mongoose schemas.
 *
 * `syncIndexes()` drops indexes that are no longer declared and recreates the
 * declared ones with their options — which is how a `unique` or `expireAfterSeconds`
 * option gets applied after a schema fix. `createIndexes()` would only add missing
 * ones and would leave a stale non-unique index in place forever.
 *
 *   npm run sync:indexes
 *
 * Safe to run repeatedly. Requires MONGODB_URI.
 */

import { config as loadEnv } from "dotenv";
import type { Model } from "mongoose";

loadEnv({ path: ".env.local" });

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exitCode = 1;
    return;
  }

  const { connect, disconnect } = await import("mongoose");

  await connect(uri, { serverSelectionTimeoutMS: 15_000 });

  const modules = await Promise.all([
    import("@/models/AppSetting"),
    import("@/models/Session"),
    import("@/models/User"),
    import("@/models/Visitor"),
  ]);

  // Each module exports its model under a different name, so pick it by shape
  // rather than by guessing the identifier.
  const models = modules
    .flatMap((module) => Object.values(module))
    .filter(
      (value): value is Model<Record<string, unknown>> =>
        typeof value === "function" &&
        "syncIndexes" in value &&
        typeof (value as { modelName?: unknown }).modelName === "string",
    );

  for (const model of models) {
    await model.syncIndexes();

    const indexes = await model.collection.indexes();
    console.log(`\n${model.modelName}:`);
    for (const index of indexes) {
      const flags = [
        index.unique ? "UNIQUE" : null,
        index.expireAfterSeconds !== undefined
          ? `TTL=${index.expireAfterSeconds}s`
          : null,
      ]
        .filter(Boolean)
        .join("  ");

      console.log(`  ${index.name}  ${JSON.stringify(index.key)}${flags ? `  ${flags}` : ""}`);
    }
  }

  await disconnect();
  console.log("\nIndexes are in sync.\n");
}

void main().catch((error: unknown) => {
  console.error("Index sync failed:", error);
  process.exitCode = 1;
});