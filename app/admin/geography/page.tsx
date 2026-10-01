import type { Metadata } from "next";

import { getVisitorsByCity, getVisitorsByCountry } from "@/lib/analytics";
import { resolveDateRange } from "@/lib/date-range";

import { GeographyView } from "./geography-view";

export const metadata: Metadata = {
  title: "Geography",
  robots: { index: false, follow: false },
};

const COUNTRY_LIMIT = 40;
const CITY_LIMIT = 60;

/**
 * Country and city breakdowns, aggregated on the server from the range in the
 * URL so switching periods re-renders rather than refetching from the browser.
 */
export default async function AdminGeographyPage({
  searchParams,
}: PageProps<"/admin/geography">) {
  const params = await searchParams;
  const range = resolveDateRange(
    typeof params.range === "string" ? params.range : "",
    typeof params.from === "string" ? params.from : "",
    typeof params.to === "string" ? params.to : "",
  );

  const [countries, cities] = await Promise.all([
    getVisitorsByCountry(range, COUNTRY_LIMIT),
    getVisitorsByCity(range, CITY_LIMIT),
  ]);

  return <GeographyView countries={countries} cities={cities} />;
}