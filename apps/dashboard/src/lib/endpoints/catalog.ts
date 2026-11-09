import { http } from "../api";
import { ingredientsApi } from "./ingredients";
import type {
  CreateLaborRateDto,
  CreateProductCategoryDto,
  CreateRecipeDto,
  CreateToolDto,
  CreateUomDto,
  LaborRateListResponse,
  LaborRateResponse,
  ProductCategoryListResponse,
  ProductCategoryResponse,
  RecipeListResponse,
  RecipeResponse,
  ToolListResponse,
  ToolResponse,
  UomListResponse,
  UomResponse,
  UpdateLaborRateDto,
  UpdateProductCategoryDto,
  UpdateRecipeDto,
  UpdateToolDto,
  UpdateUomDto,
} from "@bakery/shared-schemas";

type ListParams = { page?: number; pageSize?: number };

function crud<TList, TItem, TCreate, TUpdate>(path: string) {
  return {
    list: (params: ListParams = {}, signal?: AbortSignal) =>
      http
        .get<TList>(path, signal ? { params, signal } : { params })
        .then((response) => response.data),
    get: (id: string) => http.get<TItem>(`${path}/${id}`).then((response) => response.data),
    create: (body: TCreate) => http.post<TItem>(path, body).then((response) => response.data),
    update: (id: string, body: TUpdate) =>
      http.patch<TItem>(`${path}/${id}`, body).then((response) => response.data),
    remove: (id: string) => http.delete(`${path}/${id}`).then(() => undefined),
  };
}

export const catalogApi = {
  ingredients: ingredientsApi,
  categories: crud<
    ProductCategoryListResponse,
    ProductCategoryResponse,
    CreateProductCategoryDto,
    UpdateProductCategoryDto
  >("/product-categories"),
  recipes: crud<RecipeListResponse, RecipeResponse, CreateRecipeDto, UpdateRecipeDto>("/recipes"),
  uoms: crud<UomListResponse, UomResponse, CreateUomDto, UpdateUomDto>("/uoms"),
  tools: crud<ToolListResponse, ToolResponse, CreateToolDto, UpdateToolDto>("/tools"),
  laborRates: crud<
    LaborRateListResponse,
    LaborRateResponse,
    CreateLaborRateDto,
    UpdateLaborRateDto
  >("/labor-rates"),
};
