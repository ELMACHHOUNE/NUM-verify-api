/**
 * Seeds the analytics collection with demo visitors.
 *
 * Useful for evaluating the dashboard without waiting for real traffic, and for
 * verifying aggregation pipelines against a known data shape.
 *
 *   npm run seed            # adds 240 demo visitors
 *   npm run seed -- --count 500 --reset
 *
 * Flags:
 *   --count <n>   how many documents to insert (default 240)
 *   --reset       delete every existing visitor first
 *
 * Requires MONGODB_URI. Exits without writing anything if it is unset.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const countArg = readFlag("--count") ?? "240";
const COUNT = Number.parseInt(countArg, 10);
const RESET = process.argv.includes("--reset");

const VISITOR_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "California", city: "San Francisco", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles", offset: -7, currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "England", city: "London", lat: 51.5072, lon: -0.1276, tz: "Europe/London", offset: 1, currency: "GBP" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "Berlin", city: "Berlin", lat: 52.52, lon: 13.405, tz: "Europe/Berlin", offset: 2, currency: "EUR" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "Maharashtra", city: "Mumbai", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata", offset: 5.5, currency: "INR" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "São Paulo", city: "São Paulo", lat: -23.5505, lon: -46.6333, tz: "America/Sao_Paulo", offset: -3, currency: "BRL" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Lagos", city: "Lagos", lat: 6.5244, lon: 3.3792, tz: "Africa/Lagos", offset: 1, currency: "NGN" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "New South Wales", city: "Sydney", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney", offset: 10, currency: "AUD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "Ontario", city: "Toronto", lat: 43.6532, lon: -79.3832, tz: "America/Toronto", offset: -4, currency: "CAD" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "Tokyo", city: "Tokyo", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo", offset: 9, currency: "JPY" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Gauteng", city: "Johannesburg", lat: -26.2041, lon: 28.0473, tz: "Africa/Johannesburg", offset: 2, currency: "ZAR" },
] as const;

const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet"] as const;
const OPERATING_SYSTEMS = ["Windows", "macOS", "iOS", "Android", "Linux"] as const;
const DEVICE_BY_OS: Record<string, string> = {
  iOS: "mobile",
  Android: "mobile",
  macOS: "desktop",
  Windows: "desktop",
  Linux: "desktop",
};
const ISPS = ["Cloudflare", "Comcast", "BT Group", "Deutsche Telekom", "Jio", "Vodafone"] as const;
const PAGES = ["/", "/phonecheck", "/history"] as const;
const REFERRERS = [
  "https://www.google.com/",
  "https://news.ycombinator.com/",
  "https://x.com/",
  null,
  null,
  null,
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic PRNG so repeated seeds produce a comparable distribution. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100_000) / 100_000;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] as T;
}

/** Skews toward the first entries so a few countries dominate, as in real data. */
function pickWeighted<T>(random: () => number, values: readonly T[]): T {
  const index = Math.floor(Math.pow(random(), 1.8) * values.length);
  return values[Math.min(index, values.length - 1)] as T;
}

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local before seeding.");
    process.exitCode = 1;
    return;
  }

  const { connect, disconnect } = await import("mongoose");
  const { Visitor } = await import("@/models/Visitor");

  await connect(uri, { serverSelectionTimeoutMS: 15_000 });

  if (RESET) {
    const { deletedCount } = await Visitor.deleteMany({});
    console.log(`Deleted ${deletedCount} existing visitor documents.`);
  }

  const total = Number.isFinite(COUNT) ? COUNT : 0;

  if (total <= 0) {
    console.error("--count must be a positive number.");
    process.exitCode = 1;
    return;
  }

  const random = makeRandom(0xc0ffee);
  const now = Date.now();
  const documents = [];

  for (let index = 0; index < total; index += 1) {
    const country = pickWeighted(random, VISITOR_COUNTRIES);
    const operatingSystem = pick(random, OPERATING_SYSTEMS);
    const lastSeenOffsetMs = Math.floor(Math.pow(random(), 2.2) * 45 * DAY_MS);
    const lastSeen = new Date(now - lastSeenOffsetMs);
    const visitCount = 1 + Math.floor(Math.pow(random(), 2) * 12);

    documents.push({
      ip: `198.51.100.${1 + (index % 254)}`,
      ipType: "ipv4",
      countryCode: country.code,
      countryName: country.name,
      countryFlag: country.flag,
      callingCode: country.code === "US" ? "+1" : country.code === "GB" ? "+44" : null,
      isEu: ["DE"].includes(country.code) ? true : null,
      regionName: country.region,
      city: country.city,
      latitude: country.lat,
      longitude: country.lon,
      timezone: country.tz,
      timezoneOffset: country.offset,
      currencyCode: country.currency,
      asn: 15_000 + Math.floor(random() * 40_000),
      isp: pick(random, ISPS),
      org: pick(random, ISPS),
      connectionType: pick(random, ["cable", "dsl", "fiber", "cellular"]),
      deviceType: DEVICE_BY_OS[operatingSystem] ?? "other",
      browser: pick(random, BROWSERS),
      operatingSystem,
      referrer: pick(random, REFERRERS),
      page: pick(random, PAGES),
      geolocatedAt: lastSeen,
      firstSeen: new Date(lastSeen.getTime() - Math.floor(random() * 60 * DAY_MS)),
      lastSeen,
      visitCount,
    });
  }

  const inserted = await Visitor.insertMany(documents, { ordered: false });

  // Ensure the unique-IP index exists so the tracking upsert stays correct even
  // on a database that has never been seeded before.
  await Visitor.syncIndexes();

  console.log(
    `Inserted ${inserted.length} demo visitors into "${Visitor.db.name}".`,
  );
  console.log("Run `npm run dev` and open /admin to view the dashboard.");

  await disconnect();
}

// Top-level `await` is unavailable because the project compiles as CommonJS, so
// the entry point is invoked explicitly and failures surface as a non-zero exit.
void main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});