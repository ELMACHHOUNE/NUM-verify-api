"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { AdminApiError, getAdmin, patchAdmin } from "@/components/admin/admin-api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ACTIVE_WINDOW_OPTIONS,
  RETENTION_OPTIONS,
  type ActiveWindowMinutes,
  type AppSettings,
  type RetentionDays,
} from "@/types/analytics";

const ACTIVE_WINDOW_LABELS: Record<ActiveWindowMinutes, string> = {
  1: "1 minute",
  5: "5 minutes",
  15: "15 minutes",
  30: "30 minutes",
};

const RETENTION_LABELS: Record<RetentionDays, string> = {
  30: "30 days",
  90: "90 days",
  180: "180 days",
  365: "1 year",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await getAdmin<{ settings: AppSettings }>("/api/admin/settings");
        if (!cancelled) setSettings(data.settings);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof AdminApiError ? cause.message : "Unable to load settings.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);

    try {
      const data = await patchAdmin<{ settings: AppSettings }>("/api/admin/settings", {
        visitorTracking: settings.visitorTracking,
        trackPageViews: settings.trackPageViews,
        trackReferrer: settings.trackReferrer,
        dataRetentionDays: settings.dataRetentionDays,
        activeWindowMinutes: settings.activeWindowMinutes,
      });
      setSettings(data.settings);
      setSavedAt(new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) {
    return (
      <div className="space-y-5">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Settings</h1>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Controls how visitor data is collected and interpreted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Toggle
            id="visitorTracking"
            label="Visitor tracking"
            description="Master switch. When off, the tracking endpoint returns 403 and no data is recorded."
            checked={settings.visitorTracking}
            onChange={(value) => setSettings({ ...settings, visitorTracking: value })}
          />
          <Toggle
            id="trackPageViews"
            label="Track page views"
            description="Record which page a visitor most recently viewed."
            checked={settings.trackPageViews}
            disabled={!settings.visitorTracking}
            onChange={(value) => setSettings({ ...settings, trackPageViews: value })}
          />
          <Toggle
            id="trackReferrer"
            label="Track referrer"
            description="Store the referring host so traffic sources can be grouped."
            checked={settings.trackReferrer}
            disabled={!settings.visitorTracking}
            onChange={(value) => setSettings({ ...settings, trackReferrer: value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activeWindow">Active window</Label>
            <Select
              value={String(settings.activeWindowMinutes)}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  activeWindowMinutes: Number(value) as ActiveWindowMinutes,
                })
              }
            >
              <SelectTrigger id="activeWindow" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {ACTIVE_WINDOW_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How recently a visitor must have been seen to count as active.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention">Data retention</Label>
            <Select
              value={String(settings.dataRetentionDays)}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  dataRetentionDays: Number(value) as RetentionDays,
                })
              }
            >
              <SelectTrigger id="retention" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {RETENTION_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Visitors idle for longer than this are eligible for cleanup by
              <code className="mx-1">purgeExpiredVisitors()</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {savedAt && (
          <p className="text-xs text-muted-foreground">
            Saved at{" "}
            {new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(new Date(savedAt))}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}