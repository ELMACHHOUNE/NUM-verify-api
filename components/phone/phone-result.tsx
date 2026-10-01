import {
  BuildingIcon,
  GlobeIcon,
  HashIcon,
  MapPinIcon,
  PhoneIcon,
  RadioTowerIcon,
} from "lucide-react";

import { ResultCard } from "@/components/phone/result-card";
import { StatusBadge } from "@/components/phone/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countryFlag } from "@/lib/countries";
import { formatLineType } from "@/lib/format";
import type { PhoneValidationResult } from "@/types/phone";

interface PhoneResultProps {
  result: PhoneValidationResult;
}

function buildSummary(result: PhoneValidationResult): {
  headline: string;
  detail: string;
} {
  const countryName = result.country.name ?? "an unknown country";
  const lineType = result.lineType ? formatLineType(result.lineType).toLowerCase() : null;

  if (!result.valid) {
    return {
      headline: "This number could not be validated.",
      detail:
        "Please check the country and number format, then try again. A number can be rejected because the numbering plan changed or the digits are incomplete.",
    };
  }

  return {
    headline: lineType
      ? `This number is recognized as a valid ${lineType} number.`
      : "This number is recognized as a valid phone number.",
    detail: `The lookup service returned data for ${countryName}.`,
  };
}

export function PhoneResult({ result }: PhoneResultProps) {
  const summary = buildSummary(result);
  const countryMeta = [result.country.code, result.country.prefix]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card aria-labelledby="result-heading">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="result-heading">Analysis result</CardTitle>
          <StatusBadge valid={result.valid} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-mono text-lg font-medium break-all tracking-tight">
            {result.formats.international ?? result.phoneNumber}
          </p>
          <p className="mt-2 text-sm font-medium">Phone analysis</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {summary.headline} {summary.detail}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            The number was validated by the phone-number lookup service. This is
            numbering information, not proof of who owns the number.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResultCard
            icon={GlobeIcon}
            label="Country"
            value={result.country.name}
            hint={countryMeta || null}
          />
          <ResultCard
            icon={RadioTowerIcon}
            label="Line type"
            value={result.lineType ? formatLineType(result.lineType) : null}
          />
          <ResultCard
            icon={BuildingIcon}
            label="Carrier"
            value={result.carrier}
            hint={result.carrier ? null : "Not included in every subscription plan."}
          />
          <ResultCard
            icon={MapPinIcon}
            label="Location"
            value={result.location}
            hint={result.location ? null : "Not included in every subscription plan."}
          />
          <ResultCard
            icon={PhoneIcon}
            label="International format"
            value={result.formats.international}
            mono
          />
          <ResultCard icon={HashIcon} label="Local format" value={result.formats.local} mono />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{countryFlag(result.country.code)}</span>
            Checked {new Date(result.checkedAt).toLocaleString("en-GB")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
