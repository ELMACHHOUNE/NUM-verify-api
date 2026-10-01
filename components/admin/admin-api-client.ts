"use client";

/**
 * Tiny fetch wrapper for the admin API.
 *
 * Centralises the JSON handling and the 401 redirect so individual components
 * only deal with data.
 */

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * Thrown when the session has expired, so callers can react (e.g. refresh) and the
 * route that can redirect handles the navigation.
 */
export class AdminUnauthenticatedError extends AdminApiError {
  constructor() {
    super("Session expired.", 401);
    this.name = "AdminUnauthenticatedError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  // A 401 means the session is gone. `AdminUnauthenticatedError` lets the page
  // call `router.refresh()`, which re-runs the server layout guard and lands the
  // visitor on the sign-in page.
  if (response.status === 401) {
    throw new AdminUnauthenticatedError();
  }

  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new AdminApiError(data.error ?? `Request failed (${response.status}).`, response.status);
  }

  return data;
}

export function getAdmin<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function postAdmin<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function patchAdmin<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}