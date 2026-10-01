/**
 * Creates the first administrator account.
 *
 * Bootstrap only — once an admin exists, further admins are granted from
 * `/admin/users` so that adding an administrator is always an auditable action
 * taken by a signed-in admin rather than a shell command on the server.
 *
 *   npm run seed:admin -- --email you@example.com --name "Your Name"
 *   npm run seed:admin -- --email you@example.com --password "a-long-passphrase"
 *
 * With neither `--password` nor `ADMIN_PASSWORD` set, the password is read from
 * stdin without echo. The value is never written to disk or to the log.
 *
 * Flags:
 *   --email <address>   required
 *   --name <name>       display name (default: derived from the address)
 *   --password <value>  password; omit to be prompted
 *   --force             update the password/role if the account already exists
 */

import { config as loadEnv } from "dotenv";
import { stdin, stdout } from "node:process";

loadEnv({ path: ".env.local" });

const MIN_PASSWORD_LENGTH = 10;

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const has = (name: string) => process.argv.includes(name);

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** Reads a secret without echoing it back to the terminal. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = stdout;
    const input = stdin;

    // Suppress echo for the duration of the prompt.
    const wasRaw = input.isRaw;
    if (input.isTTY) input.setRawMode(true);

    output.write(question);
    let value = "";

    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");

      switch (char) {
        case "\r":
        case "\n":
        case "\u0004":
          input.off("data", onData);
          if (input.isTTY) input.setRawMode(Boolean(wasRaw));
          output.write("\n");
          resolve(value);
          break;
        case "\u0003": // Ctrl-C
          input.off("data", onData);
          if (input.isTTY) input.setRawMode(Boolean(wasRaw));
          output.write("\n");
          reject(new Error("Aborted"));
          break;
        case "\u007f": // Backspace
        case "\b":
          value = value.slice(0, -1);
          break;
        default:
          // Ignore other control characters.
          if (char >= " ") value += char;
      }
    };

    input.on("data", onData);
  });
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) fail("MONGODB_URI is not set. Add it to .env.local first.");

  const email = (flag("--email") ?? "").trim();
  if (!email) fail("Pass --email <address>.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" is not a valid email address.`);

  const name = (flag("--name") ?? email.split("@")[0] ?? "Administrator").trim();

  let password = flag("--password") ?? process.env.ADMIN_PASSWORD ?? null;

  if (!password) {
    // `readline` echoes by default, which would leave the passphrase visible in
    // terminal history and scrollback, so both prompts suppress echo.
    password = (await promptHidden("Password: ")).trim();
    const confirm = (await promptHidden("Confirm password: ")).trim();

    if (password !== confirm) fail("The passwords did not match.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const { connect, disconnect } = await import("mongoose");
  const { createUser, hashPassword, findUserByEmail } = await import("@/lib/auth");
  const { User } = await import("@/models/User");
  const { Session } = await import("@/models/Session");

  await connect(uri, { serverSelectionTimeoutMS: 15_000 });

  const existing = await findUserByEmail(email);

  if (existing) {
    if (!has("--force")) {
      fail(
        `An account already exists for ${email}.\n` +
          `Re-run with --force to reset its password and grant the admin role.`,
      );
    }

    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: "admin",
          isActive: true,
          name,
          passwordHash: await hashPassword(password),
        },
      },
    ).exec();

    // A reset must invalidate every existing session for that account.
    const revoked = await Session.deleteMany({ userId: existing._id }).exec();

    console.log(`\n✓ Updated ${email}`);
    console.log(`  role:    admin`);
    console.log(`  active:  true`);
    console.log(`  revoked: ${revoked.deletedCount ?? 0} existing session(s)\n`);
  } else {
    const user = await createUser({ email, name, password, role: "admin" });
    console.log(`\n✓ Created administrator ${user.email}`);
    console.log(`  id: ${user.id}\n`);
  }

  const admins = await User.countDocuments({ role: "admin", isActive: true });
  console.log(`Active administrators: ${admins}`);
  console.log("Sign in at /login\n");

  await disconnect();
}

void main().catch((error: unknown) => {
  console.error("\n✗ Failed:", error);
  process.exitCode = 1;
});