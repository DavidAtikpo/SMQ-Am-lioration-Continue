import { withAuth } from "next-auth/middleware";
import { getAuthSecret } from "@/lib/auth-secret";

export default withAuth({
  secret: getAuthSecret(),
  callbacks: {
    authorized: ({ token }) => token?.role === "ADMIN",
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
