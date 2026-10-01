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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new AdminApiError("Session expired.", 401);
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