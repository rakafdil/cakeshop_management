import { useEffect, useState, useSyncExternalStore } from "react";
import { authApi } from "@/lib/endpoints/auth";
import { seed } from "./seed";
import type { Db } from "./types";

const KEY = "cakeshop-db-v1";
let state: Db = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seed, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function getDb() { load(); return state; }

/** Mutate a deep copy of the db; throws propagate to caller (state untouched). */
export function mutate<T>(fn: (db: Db) => T): T {
  load();
  const draft = structuredClone(state);
  const result = fn(draft);
  state = draft;
  emit();
  return result;
}

export function resetDb() {
  const session = state.session;
  state = { ...structuredClone(seed), session };
  emit();
}

export function useDb(): Db {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    getDb,
    () => seed,
  );
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function useCurrentUser() {
  const db = useDb();
  return db.session ? db.user.find((u) => u.id === db.session!.userId) ?? null : null;
}

export async function login(email: string, password: string) {
  const account = await authApi.login({ email, password });
  return mutate((db) => {
    const user = {
      ...account,
      password: "",
    };
    const existing = db.user.findIndex((item) => item.id === user.id);
    if (existing >= 0) db.user[existing] = user;
    else db.user.push(user);
    db.session = { userId: user.id };
    return user;
  });
}

export async function logout() {
  await authApi.logout();
  mutate((db) => { db.session = null; });
}
