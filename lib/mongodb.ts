import "server-only";

import mongoose from "mongoose";

/**
 * MongoDB connection helper.
 *
 * A single cached connection is reused across hot reloads and route handlers,
 * which is the pattern Mongoose recommends for Next.js. Everything downstream
 * depends on {@link getConnection}, so failures surface as a typed
 * {@link DatabaseError} that the UI can render as a friendly state instead of
 * crashing the dashboard.
 */

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 5_000;

/** Reuse the global connection across dev-server hot reloads. */
const globalCache = globalThis as unknown as {
  __insighthubMongo?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

export class DatabaseError extends Error {
  readonly code: "NOT_CONFIGURED" | "UNAVAILABLE";

  constructor(
    code: DatabaseError["code"],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "DatabaseError";
    this.code = code;
  }
}

function getUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new DatabaseError("NOT_CONFIGURED", "MONGODB_URI is not set.");
  }
  return uri;
}

/** Whether a connection string is present, without attempting to connect. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function connect(): Promise<typeof mongoose> {
  const uri = getUri();

  mongoose.set("strictQuery", true);

  const instance = await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
  });

  return instance;
}

/**
 * Returns a live Mongoose connection, connecting lazily on first use.
 *
 * @throws {DatabaseError} when `MONGODB_URI` is missing or the server cannot be
 * reached. Callers are expected to handle it and render an error state.
 */
export async function getConnection(): Promise<typeof mongoose> {
  const cached = globalCache.__insighthubMongo;
  if (cached?.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached?.promise) return cached.promise;

  const promise = connect()
    .then((instance) => {
      globalCache.__insighthubMongo = { conn: instance, promise: null };
      return instance;
    })
    .catch((error: unknown) => {
      globalCache.__insighthubMongo = { conn: null, promise: null };
      throw new DatabaseError("UNAVAILABLE", "Unable to reach the database.", {
        cause: error,
      });
    });

  globalCache.__insighthubMongo = { conn: null, promise };
  return promise;
}

/** Lightweight liveness probe used by the admin health panel. */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; detail: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, detail: "MONGODB_URI is not set" };
  }

  try {
    const instance = await getConnection();
    await instance.connection.db?.admin().ping();
    return { ok: true, detail: `Connected to ${instance.connection.name ?? "MongoDB"}` };
  } catch (error) {
    const detail =
      error instanceof DatabaseError ? error.message : "Unable to reach the database.";
    return { ok: false, detail };
  }
}
