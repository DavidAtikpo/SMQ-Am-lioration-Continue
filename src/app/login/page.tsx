"use client";

import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { SmqLocaleProvider, useSmqLocale } from "@/hooks/use-smq-locale";

function LoginFallbackInner() {
  const { t } = useSmqLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-muted">
      {t("pageLoading")}
    </div>
  );
}

function LoginFallback() {
  return (
    <SmqLocaleProvider>
      <LoginFallbackInner />
    </SmqLocaleProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
