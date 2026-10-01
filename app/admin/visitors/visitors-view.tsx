"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react";

import { DateRangePicker } from "@/components/admin/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDeviceType,
  formatDateTimeUtc,
  formatRelativeTime,
  orUnavailable,
} from "@/lib/analytics-format";
import type { Paginated, VisitorFilterOptions, VisitorListItem } from "@/types/analytics";

const ALL = "__all__";
const PAGE_SIZES = [25, 50, 100] as const;
const FILTER_KEYS = ["search", "country", "city", "device", "browser", "os"] as const;

export function VisitorsView({
  initial,
  options,
  query,
}: {
  initial: Paginated<VisitorListItem>;
  options: VisitorFilterOptions;
  /** The current search string, rendered on the server so the controls match. */
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const params = new URLSearchParams(query);

  function update(next: Record<string, string>) {
    const search = new URLSearchParams(query);
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // Any filter change resets pagination, otherwise a narrowed result set can
    // land the user on an empty page.
    search.delete("page");
    router.push(`${pathname}?${search.toString()}`);
  }

  function setPage(page: number) {
    const search = new URLSearchParams(query);
    search.set("page", String(page));
    router.push(`${pathname}?${search.toString()}`);
  }

  const hasFilters = FILTER_KEYS.some((key) => params.has(key));
  const rows = initial.items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <form
          className="relative min-w-52 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("search");
            update({ search: typeof value === "string" ? value : "" });
          }}
        >
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="search"
            defaultValue={params.get("search") ?? ""}
            placeholder="Search IP, city, region or ISP"
            className="pl-8"
            maxLength={80}
          />
        </form>

        <FilterSelect
          label="Country"
          value={params.get("country") ?? ""}
          placeholder="All countries"
          options={options.countries.map((c) => ({ value: c.code, label: c.name || c.code }))}
          onChange={(value) => update({ country: value })}
        />

        <FilterSelect
          label="City"
          value={params.get("city") ?? ""}
          placeholder="All cities"
          options={options.cities.map((city) => ({ value: city, label: city }))}
          onChange={(value) => update({ city: value })}
        />

        <FilterSelect
          label="Device"
          value={params.get("device") ?? ""}
          placeholder="All devices"
          options={["desktop", "mobile", "tablet", "bot", "other"].map((d) => ({
            value: d,
            label: formatDeviceType(d),
          }))}
          onChange={(value) => update({ device: value })}
        />

        <FilterSelect
          label="Browser"
          value={params.get("browser") ?? ""}
          placeholder="All browsers"
          options={options.browsers.map((b) => ({ value: b, label: b }))}
          onChange={(value) => update({ browser: value })}
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${pathname}?range=${params.get("range") ?? "last7"}`)}
          >
            <XIcon aria-hidden="true" />
            Clear
          </Button>
        )}

        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={`/api/admin/visitors/export?${query}`} download>
            <DownloadIcon aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows</span>
          <Select
            value={String(initial.pageSize)}
            onValueChange={(value) => update({ pageSize: value })}
          >
            <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead>First seen</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="sr-only">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No visitors match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-mono text-xs">{visitor.ip}</TableCell>
                      <TableCell>
                        <span className="block max-w-48 truncate">
                          {visitor.countryFlag ? `${visitor.countryFlag} ` : ""}
                          {orUnavailable(visitor.countryName)}
                        </span>
                        <span className="block max-w-48 truncate text-xs text-muted-foreground">
                          {[visitor.regionName, visitor.city].filter(Boolean).join(", ") ||
                            "No city data"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="block">{formatDeviceType(visitor.deviceType)}</span>
                        <span className="block text-muted-foreground">
                          {orUnavailable(visitor.browser)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                        {orUnavailable(visitor.isp)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {visitor.visitCount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeUtc(visitor.firstSeen)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelativeTime(visitor.lastSeen)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/visitors/${visitor.id}`}>Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {initial.page} of {initial.totalPages} · {initial.total} visitors
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={initial.page <= 1}
            onClick={() => setPage(initial.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={initial.page >= initial.totalPages}
            onClick={() => setPage(initial.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value === "" ? ALL : value} onValueChange={(next) => onChange(next === ALL ? "" : next)}>
      <SelectTrigger size="sm" className="w-full sm:w-44" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}