import { http, setCsrfToken } from "../api";
import type { AuthUserDto, LoginDto } from "@bakery/shared-schemas";

type AuthResponse = {
  user: AuthUserDto;
  csrfToken?: string;
};

export const authApi = {
  login: (body: LoginDto) =>
    http.post<AuthResponse>("/auth/login", body).then((response) => {
      setCsrfToken(response.data.csrfToken);
      return response.data.user;
    }),
  me: () => http.get<{ user: AuthUserDto }>("/auth/me").then((response) => response.data.user),
  logout: () =>
    http.post<{ ok: boolean }>("/auth/logout").then(() => {
      setCsrfToken(undefined);
    }),
};
