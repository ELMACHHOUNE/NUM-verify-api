"use client";

import { DateRangePicker } from "@/components/admin/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount, formatPercent } from "@/lib/analytics-format";
import type { CityBreakdownItem, CountryBreakdownItem } from "@/types/analytics";

interface GeographyItem {
  key: string;
  label: string;
  sub: string | null;
  visitors: number;
  share: number;
}

export function GeographyView({
  countries,
  cities,
}: {
  countries: CountryBreakdownItem[];
  cities: CityBreakdownItem[];
}) {
  const countryItems: GeographyItem[] = countries.map((item) => ({
    key: item.key,
    label: item.flag ? `${item.flag} ${item.label}` : item.label,
    sub: null,
    visitors: item.visitors,
    share: item.share,
  }));

  const cityItems: GeographyItem[] = cities.map((item) => ({
    key: item.key,
    label: item.label,
    sub: item.countryName,
    visitors: item.visitors,
    share: item.share,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Geography</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Where visitors are connecting from, based on IP geolocation.
          </p>
        </div>
        <DateRangePicker />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Countries" items={countryItems} />
        <Breakdown title="Cities" items={cityItems} />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Locations are inferred from IP addresses by IPstack. They represent the network
        location, not a precise physical position.
      </p>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: GeographyItem[] }) {
  const max = items.reduce((peak, item) => Math.max(peak, item.visitors), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No geolocated visitors in this range.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {item.label}
                    {item.sub && <span className="text-muted-foreground"> · {item.sub}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatCount(item.visitors)} · {formatPercent(item.share)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${max > 0 ? Math.max(2, (item.visitors / max) * 100) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}