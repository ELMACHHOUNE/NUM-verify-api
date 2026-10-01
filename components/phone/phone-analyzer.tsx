"use client";

import { useCallback, useRef, useState } from "react";

import { PhoneForm } from "@/components/phone/phone-form";
import { PhoneResult } from "@/components/phone/phone-result";
import { ResultError } from "@/components/phone/result-error";
import { ResultLoading } from "@/components/phone/result-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addHistoryEntry, createHistoryEntry } from "@/lib/history";
import type { PhoneValidationResponse, PhoneValidationResult } from "@/types/phone";

const FALLBACK_ERROR =
  "Unable to validate phone number. Please check the number and try again.";

/**
 * Client orchestrator for the analyzer: owns request state, calls the internal
 * API route (never Numverify directly) and stores successful lookups locally.
 */
export function PhoneAnalyzer() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<PhoneValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastNumberRef = useRef<string | null>(null);

  const analyze = useCallback(async (phoneNumber: string) => {
    lastNumberRef.current = phoneNumber;
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/phone/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!isPhoneValidationResponse(payload)) {
        setErrorMessage(FALLBACK_ERROR);
        setStatus("error");
        return;
      }

      if (!payload.success) {
        setErrorMessage(payload.error);
        setStatus("error");
        return;
      }

      setResult(payload.data);
      setStatus("done");
      addHistoryEntry(createHistoryEntry(payload.data));
    } catch {
      setErrorMessage(FALLBACK_ERROR);
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    const previous = lastNumberRef.current;
    if (previous) void analyze(previous);
  }, [analyze]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyze a number</CardTitle>
        </CardHeader>
        <CardContent>
          <PhoneForm onAnalyze={analyze} />
        </CardContent>
      </Card>

      {status === "loading" ? <ResultLoading /> : null}
      {status === "error" && errorMessage ? (
        <ResultError message={errorMessage} onRetry={retry} />
      ) : null}
      {status === "done" && result ? <PhoneResult result={result} /> : null}
    </div>
  );
}

function isPhoneValidationResponse(
  payload: unknown,
): payload is PhoneValidationResponse {
  return typeof payload === "object" && payload !== null && "success" in payload;
}
