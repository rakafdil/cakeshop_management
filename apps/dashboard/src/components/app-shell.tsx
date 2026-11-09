import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChefHat,
  Home,
  Lock,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { refreshCatalog, useCurrentUser, useHydrated } from "@/lib/db/store";
import type { User } from "@/lib/db/types";
import { Button as NavigationButton } from "@/components/ui/button";

const adminTabs = [
  { to: "/", label: "Beranda", icon: Home, exact: true },
  { to: "/orders", label: "Pesanan", icon: ReceiptText, exact: false },
  { to: "/kitchen", label: "Dapur", icon: ChefHat, exact: false },
  { to: "/finance", label: "Keuangan", icon: Wallet, exact: false },
  { to: "/more", label: "Lainnya", icon: MoreHorizontal, exact: false },
] as const;
const staffTabs = adminTabs.filter((t) => t.to !== "/finance");

/** Authenticated mobile shell. Pass `adminOnly` to block staff. */
export function AppShell({
  title,
  subtitle,
  action,
  back,
  children,
  fab = true,
  adminOnly,
  bottomBar,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  back?: boolean;
  children: (user: User) => ReactNode;
  fab?: boolean;
  adminOnly?: boolean;
  bottomBar?: ReactNode;
}) {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login", replace: true });
  }, [hydrated, user, navigate]);

  useEffect(() => {
    if (!hydrated || !user) return;
    refreshCatalog().catch((error) => {
      console.error("Gagal memuat katalog dari API", error);
    });
  }, [hydrated, user?.id]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const tabs = user.role === "admin" ? adminTabs : staffTabs;
  const blocked = adminOnly && user.role !== "admin";

  return (
    <div
      className={`mx-auto min-h-screen max-w-md bg-background ${bottomBar ? "pb-28" : back ? "pb-10" : "pb-28"}`}
    >
      {(title || back) && (
        <header className="sticky top-0 z-20 bg-background/95 px-5 pb-3 pt-5 backdrop-blur">
          {back && (
            <button
              onClick={() => router.history.back()}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
          )}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {subtitle && (
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {subtitle}
                </p>
              )}
              {title && (
                <h1 className="font-display text-[1.7rem] font-semibold leading-tight">{title}</h1>
              )}
            </div>
            {action}
          </div>
        </header>
      )}
      <main className="px-5">
        {blocked ? (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
            <Lock className="h-10 w-10" />
            <p className="mt-3 font-semibold text-foreground">Khusus pemilik</p>
            <p className="text-sm">Halaman ini hanya bisa dibuka akun pemilik.</p>
          </div>
        ) : (
          children(user)
        )}
      </main>

      {bottomBar && (
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t bg-card p-4">
          {bottomBar}
        </div>
      )}

      {!back && !bottomBar && (
        <>
          {fab && (
            <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-5">
              <NavigationButton
                asChild
                size="icon"
                className="pointer-events-auto ml-auto flex h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90"
              >
                <Link to="/orders/new" aria-label="Pesanan baru">
                  <Plus className="h-6 w-6" />
                </Link>
              </NavigationButton>
            </div>
          )}
          <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map((t) => (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    activeOptions={{ exact: t.exact }}
                    className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-accent"
                  >
                    <t.icon className="h-5 w-5" />
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "bg-muted text-muted-foreground",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/30";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "danger";
}) {
  const v = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    outline: "border bg-card text-foreground",
    danger: "bg-destructive/10 text-destructive",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Tutup" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-muted p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function Row({ l, v, bold }: { l: ReactNode; v: ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{l}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

export function meta(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
