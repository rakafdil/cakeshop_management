import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

let csrfToken =
  typeof window !== "undefined" ? window.sessionStorage.getItem("ck_csrf") ?? undefined : undefined;

export function setCsrfToken(token: string | undefined) {
  csrfToken = token;
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem("ck_csrf", token);
  else window.sessionStorage.removeItem("ck_csrf");
}

export const http = axios.create({
  baseURL: import.meta.env["VITE_API_URL"] ?? "/api",
  withCredentials: true,
  timeout: 15_000,
  xsrfCookieName: "ck_csrf",
  xsrfHeaderName: "x-csrf-token",
});

http.interceptors.request.use((config) => {
  if (
    typeof window !== "undefined" &&
    config.method &&
    !["get", "head", "options"].includes(config.method.toLowerCase())
  ) {
    const cookieToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("ck_csrf="))
      ?.slice("ck_csrf=".length);
    const token = csrfToken ?? cookieToken;
    if (token) config.headers.set("x-csrf-token", decodeURIComponent(token));
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string; code?: string; errors?: Record<string, string> }>) => {
    if (err.response) {
      const { status, data } = err.response;
      if (
        status === 401 &&
        typeof window !== "undefined" &&
        !location.pathname.startsWith("/login")
      ) {
        location.assign("/login");
      }
      return Promise.reject(
        new ApiError(status, data?.message ?? "Terjadi kesalahan", data?.code, data?.errors),
      );
    }
    const msg =
      err.code === "ECONNABORTED"
        ? "Server terlalu lama merespons"
        : "Tidak bisa terhubung ke server";
    return Promise.reject(new ApiError(0, msg));
  },
);

/** Helper: langsung kembalikan `data`. */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    http.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.patch<T>(url, body, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    http.delete<T>(url, config).then((r) => r.data),
};
