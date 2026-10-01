"use client";

import type { HistoryEntry, LineType, PhoneValidationResult } from "@/types/phone";
import { LINE_TYPES } from "@/types/phone";

/**
 * Client-only lookup history persisted in `localStorage`.
 *
 * Phone numbers are never sent to a remote database. Note that they *are* sent
 * to Numverify when the user runs a lookup.
 */

export const HISTORY_STORAGE_KEY = "phonecheck.history.v1";
export const HISTORY_LIMIT = 25;

const LINE_TYPE_SET = new Set<string>(LINE_TYPES);

type HistoryListener = () => void;

const listeners = new Set<HistoryListener>();
let cache: HistoryEntry[] | null = null;

function isLineType(value: unknown): value is LineType {
  return typeof value === "string" && LINE_TYPE_SET.has(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseEntry(value: unknown): HistoryEntry | null {
  if (typeof value !== "object" || value === null) return null;

  const raw = value as Record<string, unknown>;
  const phoneNumber = toNullableString(raw.phoneNumber);
  if (!phoneNumber) return null;

  return {
    id: toNullableString(raw.id) ?? phoneNumber,
    phoneNumber,
    countryName: toNullableString(raw.countryName),
    countryCode: toNullableString(raw.countryCode),
    lineType: isLineType(raw.lineType) ? raw.lineType : null,
    carrier: toNullableString(raw.carrier),
    location: toNullableString(raw.location),
    valid: raw.valid === true,
    checkedAt: toNullableString(raw.checkedAt) ?? new Date(0).toISOString(),
  };
}

function readStorage(): HistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(parseEntry)
      .filter((entry): entry is HistoryEntry => entry !== null)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeStorage(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* Storage may be unavailable (private mode, quota). History is a nicety. */
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(entries: HistoryEntry[]) {
  cache = entries;
  writeStorage(entries);
  emit();
}

export function getHistorySnapshot(): HistoryEntry[] {
  cache ??= readStorage();
  return cache;
}

export function subscribeHistory(listener: HistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Invalidates the cache when another tab writes to storage. */
function handleStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== HISTORY_STORAGE_KEY) return;
  cache = null;
  emit();
}

let storageListenerAttached = false;

export function attachHistoryStorageListener(): void {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;
  window.addEventListener("storage", handleStorageEvent);
}

export function createHistoryEntry(result: PhoneValidationResult): HistoryEntry {
  return {
    id: `${result.phoneNumber}-${Date.now().toString(36)}`,
    phoneNumber: result.phoneNumber,
    countryName: result.country.name,
    countryCode: result.country.code,
    lineType: result.lineType,
    carrier: result.carrier,
    location: result.location,
    valid: result.valid,
    checkedAt: result.checkedAt,
  };
}

/** Records a lookup, de-duplicating by number and keeping the newest first. */
export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const existing = getHistorySnapshot().filter(
    (item) => item.phoneNumber !== entry.phoneNumber,
  );
  const next = [entry, ...existing].slice(0, HISTORY_LIMIT);
  commit(next);
  return next;
}

export function clearHistory(): void {
  commit([]);
}

export function removeHistoryEntry(id: string): void {
  commit(getHistorySnapshot().filter((entry) => entry.id !== id));
}
