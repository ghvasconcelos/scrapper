"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const USER_KEY = "crm:user";
const USER_EVENT = "crm:user";
const CHANGED = "crm:changed";

export function currentUser(): string {
  try {
    return localStorage.getItem(USER_KEY) || "";
  } catch {
    return "";
  }
}

export function setCurrentUser(name: string) {
  try {
    localStorage.setItem(USER_KEY, name);
  } catch {
    /* private mode: the picker simply won't persist */
  }
  window.dispatchEvent(new Event(USER_EVENT));
}

function subscribeUser(cb: () => void) {
  window.addEventListener(USER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(USER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The name picked in the sidebar ("" on the server and until hydration). */
export function useCurrentUser(): string {
  return useSyncExternalStore(subscribeUser, currentUser, () => "");
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      "x-crm-user": encodeURIComponent(currentUser()),
      ...rest.headers,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  return data as T;
}

/** Tell every mounted list that data changed (after a save in the drawer, a drag in the board…). */
export function emitChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

type State<T> = { url: string | null; data: T | null; error: string | null; done: boolean };

/** Fetch JSON, refetch on url change / reload() / emitChanged() / optional polling. Keeps stale data while refetching. */
export function useApi<T>(url: string | null, opts: { pollMs?: number } = {}) {
  const [state, setState] = useState<State<T>>({ url: null, data: null, error: null, done: false });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url)
      .then((data) => alive && setState({ url, data, error: null, done: true }))
      .catch((e: Error) => alive && setState((s) => ({ ...s, url, error: e.message, done: true })));
    return () => {
      alive = false;
    };
  }, [url, tick]);

  useEffect(() => {
    window.addEventListener(CHANGED, reload);
    return () => window.removeEventListener(CHANGED, reload);
  }, [reload]);

  useEffect(() => {
    if (!opts.pollMs) return;
    const t = setInterval(reload, opts.pollMs);
    return () => clearInterval(t);
  }, [opts.pollMs, reload]);

  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), []);
  return { data: state.data, error: state.error, loading: !state.done || state.url !== url, reload, setData };
}
