"use client";

import { useId, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SearchIcon } from "lucide-react";

import { CountrySelect } from "@/components/phone/country-select";
import { PhoneInput } from "@/components/phone/phone-input";
import { Button } from "@/components/ui/button";
import { getCountry, getDefaultCountry } from "@/lib/countries";
import {
  buildInternationalNumber,
  phoneFormSchema,
  type PhoneFormValues,
} from "@/lib/validations";

interface PhoneFormProps {
  /** Receives the sanitized international number. Must resolve when done. */
  onAnalyze: (phoneNumber: string) => Promise<void>;
  defaultCountryIso2?: string;
}

export function PhoneForm({ onAnalyze, defaultCountryIso2 }: PhoneFormProps) {
  const countryFieldId = useId();
  const countryErrorId = `${countryFieldId}-error`;
  const fallbackCountry = getCountry(defaultCountryIso2 ?? "") ?? getDefaultCountry();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { country: fallbackCountry.iso2, number: "" },
  });

  const selectedCountryIso2 = useWatch({ control, name: "country" });
  const number = useWatch({ control, name: "number" });
  const selectedCountry = getCountry(selectedCountryIso2) ?? fallbackCountry;

  const preview = useMemo(
    () => (number.trim() ? buildInternationalNumber(selectedCountryIso2, number) : null),
    [selectedCountryIso2, number],
  );

  const onSubmit = handleSubmit(async (values) => {
    await onAnalyze(buildInternationalNumber(values.country, values.number));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <div className="space-y-1.5">
              <CountrySelect
                id={countryFieldId}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                invalid={Boolean(errors.country)}
                describedBy={errors.country ? countryErrorId : undefined}
              />
              {errors.country?.message ? (
                <p id={countryErrorId} role="alert" className="text-xs text-destructive">
                  {errors.country.message}
                </p>
              ) : null}
            </div>
          )}
        />

        <Controller
          control={control}
          name="number"
          render={({ field }) => (
            <PhoneInput
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isSubmitting}
              error={errors.number?.message}
              placeholder={selectedCountry.example}
              hint={
                preview
                  ? `Will be checked as ${preview}`
                  : `${selectedCountry.dialCode} dial code added automatically. You can also enter a full international number.`
              }
            />
          )}
        />
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} className="h-9 w-full">
        {isSubmitting ? (
          <>
            <Loader2Icon className="animate-spin" aria-hidden />
            <span>Analyzing…</span>
          </>
        ) : (
          <>
            <SearchIcon aria-hidden />
            <span>Analyze Number</span>
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Validation and information lookup only — PhoneCheck does not verify number
        ownership.
      </p>
    </form>
  );
}
