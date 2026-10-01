import type { Metadata } from "next";

import { parseVisitorQuery } from "@/lib/admin-api";
import { getVisitorFilterOptions, getVisitors } from "@/lib/analytics";
import { DatabaseError, isDatabaseConfigured } from "@/lib/mongodb";
import type { Paginated, VisitorFilterOptions, VisitorListItem } from "@/types/analytics";

import { VisitorsView } from "./visitors-view";

export const metadata: Metadata = {
  title: "Visitors",
  robots: { index: false, follow: false },
};

/**
 * Paginated visitor list, read on the server.
 *
 * Every filter lives in the URL, so a filtered view is shareable and the export
 * link (`/api/admin/visitors/export` with the same query) always matches what is
 * on screen.
 */
export default async function AdminVisitorsPage({
  searchParams,
}: PageProps<"/admin/visitors">) {
  const params = await searchParams;

  // `parseVisitorQuery` expects URLSearchParams, so rebuild it from the flat props.
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") queryParams.set(key, value);
  }

  if (!isDatabaseConfigured()) {
    return (
      <Frame>
        <StorageNotice />
      </Frame>
    );
  }

  const data = await load(queryParams);

  // A failed aggregation is rethrown so Next's error boundary handles it rather
  // than a component being constructed inside this try/catch.
  if (data.error) throw data.error;

  return (
    <Frame>
      <VisitorsView
        initial={data.result}
        options={data.options}
        query={queryParams.toString()}
      />
    </Frame>
  );
}

async function load(queryParams: URLSearchParams): Promise<{
  result: Paginated<VisitorListItem>;
  options: VisitorFilterOptions;
  error: DatabaseError | null;
}> {
  try {
    const query = parseVisitorQuery(queryParams);
    const [result, options] = await Promise.all([getVisitors(query), getVisitorFilterOptions()]);
    return { result, options, error: null };
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors] ${error.code}: ${error.message}`);
      return { result: emptyPage(), options: emptyOptions(), error };
    }
    throw error;
  }
}

const EMPTY_PAGE: Paginated<VisitorListItem> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

const EMPTY_OPTIONS: VisitorFilterOptions = {
  countries: [],
  cities: [],
  devices: [],
  browsers: [],
  operatingSystems: [],
};

function emptyPage(): Paginated<VisitorListItem> {
  return { ...EMPTY_PAGE };
}

function emptyOptions(): VisitorFilterOptions {
  return { ...EMPTY_OPTIONS };
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Visitors</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          One record per IP address, deduplicated automatically.
        </p>
      </div>
      {children}
    </div>
  );
}

function StorageNotice() {
  return (
    <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
      Analytics storage is not configured. Set <code>MONGODB_URI</code> to view visitors.
    </p>
  );
}