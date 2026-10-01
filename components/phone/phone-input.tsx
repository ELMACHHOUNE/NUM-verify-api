"use client";

import { forwardRef, useId } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Labelled phone number field. Formatting and sanitization are handled upstream
 * — this component only owns accessibility, hints and validation messaging.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    { value, onChange, onBlur, error, hint, placeholder, disabled },
    ref,
  ) {
    const generatedId = useId();
    const inputId = `phone-number-${generatedId}`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const describedBy = [hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Phone number</Label>
        <Input
          ref={ref}
          id={inputId}
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          spellCheck={false}
          enterKeyHint="go"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 font-mono tracking-tight"
        />
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
