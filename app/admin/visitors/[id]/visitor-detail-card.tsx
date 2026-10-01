import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTimeUtc,
  formatDeviceType,
  formatGmtOffset,
  formatReferrer,
  orUnavailable,
} from "@/lib/analytics-format";
import type { VisitorDetail } from "@/types/analytics";

/**
 * Read-only presentation of everything stored for one visitor.
 *
 * No client component and no fetch: the page already has the document, and
 * keeping this server-side means visitor records are never exposed in the client
 * bundle or in a network response the browser can re-read.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">{value}</dd>
    </div>
  );
}

function Section({
  title,
  fields,
}: {
  title: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <Field key={field.label} label={field.label} value={field.value} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function VisitorDetailCard({ visitor }: { visitor: VisitorDetail }) {
  return (
    <div className="space-y-4">
      <Section
        title="Identity"
        fields={[
          { label: "IP address", value: visitor.ip },
          { label: "IP type", value: orUnavailable(visitor.ipType) },
          { label: "ISP", value: orUnavailable(visitor.isp) },
          { label: "Organisation", value: orUnavailable(visitor.org) },
          { label: "ASN", value: visitor.asn === null ? "Not available" : String(visitor.asn) },
          { label: "Connection", value: orUnavailable(visitor.connectionType) },
        ]}
      />

      <Section
        title="Location"
        fields={[
          {
            label: "Country",
            value: `${visitor.countryFlag ? `${visitor.countryFlag} ` : ""}${orUnavailable(visitor.countryName)}`,
          },
          { label: "Country code", value: orUnavailable(visitor.countryCode) },
          { label: "Region", value: orUnavailable(visitor.regionName) },
          { label: "Region code", value: orUnavailable(visitor.regionCode) },
          { label: "City", value: orUnavailable(visitor.city) },
          { label: "Postal code", value: orUnavailable(visitor.zip) },
          {
            label: "Coordinates",
            value:
              visitor.latitude === null || visitor.longitude === null
                ? "Not available"
                : `${visitor.latitude}, ${visitor.longitude}`,
          },
          {
            label: "Time zone",
            value: `${orUnavailable(visitor.timezone)} (${formatGmtOffset(visitor.timezoneOffset)})`,
          },
          { label: "Currency", value: orUnavailable(visitor.currencyCode) },
          { label: "Calling code", value: orUnavailable(visitor.callingCode) },
        ]}
      />

      <Section
        title="Device"
        fields={[
          { label: "Device type", value: formatDeviceType(visitor.deviceType) },
          { label: "Browser", value: orUnavailable(visitor.browser) },
          { label: "Operating system", value: orUnavailable(visitor.operatingSystem) },
        ]}
      />

      <Section
        title="Activity"
        fields={[
          { label: "Total visits", value: String(visitor.visitCount) },
          { label: "First seen", value: formatDateTimeUtc(visitor.firstSeen) },
          { label: "Last seen", value: formatDateTimeUtc(visitor.lastSeen) },
          { label: "Last page", value: orUnavailable(visitor.page) },
          { label: "Referrer", value: formatReferrer(visitor.referrer) },
          { label: "Geolocated at", value: formatDateTimeUtc(visitor.geolocatedAt) },
        ]}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Location and network data are derived from the IP address and are approximate. No
        names, e-mail addresses or phone numbers are stored for analytics.
      </p>
    </div>
  );
}