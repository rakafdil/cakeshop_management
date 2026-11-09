import { useEffect, useState, useSyncExternalStore } from "react";
import { authApi } from "@/lib/endpoints/auth";
import { catalogApi } from "@/lib/endpoints/catalog";
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

export async function refreshCatalog() {
  const [ingredients, uoms, recipes, tools, laborRates, categories] = await Promise.all([
    catalogApi.ingredients.list({ pageSize: 100 }),
    catalogApi.uoms.list({ pageSize: 100 }),
    catalogApi.recipes.list({ pageSize: 100 }),
    catalogApi.tools.list({ pageSize: 100 }),
    catalogApi.laborRates.list({ pageSize: 100 }),
    catalogApi.categories.list({ pageSize: 100 }),
  ]);

  mutate((db) => {
    db.ingredient = ingredients.data.map((item) => ({
      id: item.id,
      name: item.name,
      purchaseUomId: item.purchaseUomId,
      currentStock: Number(item.currentStock),
      minimumStock: Number(item.minimumStock),
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
    }));
    db.uom = uoms.data.map((item) => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      type: item.type as "weight" | "volume" | "count",
    }));
    db.recipe = recipes.data.map((item) => ({
      id: item.id,
      productId: item.productId,
      version: item.version,
      preparationSteps: item.preparationSteps,
      difficultyLevel: item.difficultyLevel,
      estimatedLaborMinutes: Number(item.estimatedLaborMinutes),
      isComplete: item.isComplete,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
    db.tool = tools.data.map((item) => ({
      id: item.id,
      name: item.name,
      purchaseCost: Number(item.purchaseCost),
      usefulLife: Number(item.usefulLife),
    }));
    db.laborRate = laborRates.data.map((item) => ({
      id: item.id,
      ratePerHour: Number(item.ratePerHour),
      effectiveDate: item.effectiveDate,
    }));
    db.productCategory = categories.data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
    }));
  });
}

export async function logout() {
  await authApi.logout();
  mutate((db) => { db.session = null; });
}
