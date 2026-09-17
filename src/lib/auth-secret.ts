export function getAuthSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me")
  );
}

export function getAuthUrl(): string {
  return process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}
