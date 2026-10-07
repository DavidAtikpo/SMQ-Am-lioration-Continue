"use client";

import { useEffect, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Stamp } from "lucide-react";
import { SmqLocaleSwitch } from "@/components/layout/smq-locale-switch";
import { SmqHtmlLang } from "@/components/layout/smq-html-lang";
import { SmqLocaleProvider, useSmqLocale } from "@/hooks/use-smq-locale";

function resolveCallbackPath(callbackUrl: string | null): string {
  if (!callbackUrl || callbackUrl === "null" || callbackUrl === "undefined") {
    return "/";
  }

  const decoded = decodeURIComponent(callbackUrl).trim();
  if (!decoded) return "/";

  if (decoded.startsWith("http")) {
    try {
      return new URL(decoded).pathname || "/";
    } catch {
      return "/";
    }
  }

  return decoded.startsWith("/") ? decoded : `/${decoded}`;
}

async function waitForAdminSession(): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const session = await getSession();
    if (session?.user?.role === "ADMIN") {
      return true;
    }
  }
  return false;
}

function LoginFormInner() {
  const searchParams = useSearchParams();
  const { t } = useSmqLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getSession().then((session) => {
      if (session?.user?.role === "ADMIN") {
        window.location.href = resolveCallbackPath(searchParams.get("callbackUrl"));
      }
    });
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("loginDenied"));
        return;
      }

      if (!result?.ok) {
        setError(t("loginError"));
        return;
      }

      const sessionReady = await waitForAdminSession();
      if (!sessionReady) {
        setError(t("loginSessionFail"));
        return;
      }

      window.location.href = resolveCallbackPath(searchParams.get("callbackUrl"));
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <SmqHtmlLang />
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
              <Stamp size={18} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">{t("loginTitle")}</h1>
              <p className="text-sm text-muted">{t("loginSub")}</p>
            </div>
          </div>
          <SmqLocaleSwitch />
        </div>

        {searchParams.get("error") === "admin" && (
          <div className="mb-4 rounded-lg border border-rust/20 bg-rust/10 px-4 py-3 text-sm text-rust">
            {t("loginAdminOnly")}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rust/20 bg-rust/10 px-4 py-3 text-sm text-rust">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              {t("loginEmail")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-steel"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              {t("loginPassword")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-steel"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t("loginLoading") : t("loginSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <SmqLocaleProvider>
      <LoginFormInner />
    </SmqLocaleProvider>
  );
}
