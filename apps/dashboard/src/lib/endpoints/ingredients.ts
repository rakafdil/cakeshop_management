// src/lib/endpoints/ingredients.ts
import { http } from "../api";
import type {
  IngredientListResponse, IngredientResponse, CreateIngredientDto, UpdateIngredientDto,
  IngredientPriceHistoryListResponse, IngredientPriceHistoryResponse,
  CreateIngredientPriceHistoryInput, UomListResponse,
} from "@bakery/shared-schemas";

export type ListQuery = { page?: number; pageSize?: number; q?: string };

export const ingredientsApi = {
  list: (params: ListQuery, signal?: AbortSignal) =>
    http
      .get<IngredientListResponse>("/ingredients", signal ? { params, signal } : { params })
      .then((r) => r.data),
  create: (body: CreateIngredientDto) =>
    http.post<IngredientResponse>("/ingredients", body).then((r) => r.data.data),
  get: (id: string) => http.get<IngredientResponse>(`/ingredients/${id}`).then((r) => r.data.data),
  update: (id: string, body: UpdateIngredientDto) =>
    http.patch<IngredientResponse>(`/ingredients/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => http.delete(`/ingredients/${id}`).then(() => undefined), // 204
  priceHistory: (id: string, params: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    http
      .get<IngredientPriceHistoryListResponse>(
        `/ingredients/${id}/price-history`,
        signal ? { params, signal } : { params },
      )
      .then((r) => r.data),
  addPrice: (id: string, body: CreateIngredientPriceHistoryInput) =>
    http.post<IngredientPriceHistoryResponse>(`/ingredients/${id}/price-history`, body).then((r) => r.data.data),
};

// dipakai untuk dropdown satuan beli
export const uomsApi = {
  list: (signal?: AbortSignal) =>
    http
      .get<UomListResponse>(
        "/uoms",
        signal ? { params: { pageSize: 100 }, signal } : { params: { pageSize: 100 } },
      )
      .then((r) => r.data),
};