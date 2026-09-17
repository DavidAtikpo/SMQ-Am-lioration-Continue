"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (session?.user?.role !== "ADMIN") {
      router.replace("/login?error=admin");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
          <p className="text-sm text-muted">Vérification de l&apos;accès administrateur…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
