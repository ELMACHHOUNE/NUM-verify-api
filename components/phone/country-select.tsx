"use client";

import { COUNTRIES, countryFlag } from "@/lib/countries";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountrySelectProps {
  value: string;
  onValueChange: (iso2: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id: string;
  describedBy?: string;
}

export function CountrySelect({
  value,
  onValueChange,
  disabled,
  invalid,
  id,
  describedBy,
}: CountrySelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Country</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="h-9 w-full justify-between gap-2 data-[size=default]:h-9"
        >
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectGroup>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.iso2} value={country.iso2}>
                <span aria-hidden>{countryFlag(country.iso2)}</span>
                <span className="truncate">{country.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {country.dialCode}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
