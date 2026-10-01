"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  attachHistoryStorageListener,
  getHistorySnapshot,
  subscribeHistory,
} from "@/lib/history";
import type { HistoryEntry } from "@/types/phone";

const EMPTY_SNAPSHOT: HistoryEntry[] = [];

/**
 * Subscribes to the `localStorage`-backed lookup history. Works without a
 * state-management library and stays in sync across tabs.
 */
export function useHistory(): HistoryEntry[] {
  useEffect(() => {
    attachHistoryStorageListener();
  }, []);

  return useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    () => EMPTY_SNAPSHOT,
  );
}
