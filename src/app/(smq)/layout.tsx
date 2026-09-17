import { AdminGuard } from "@/components/layout/admin-guard";
import { SmqShell } from "@/components/layout/smq-shell";

export default function SmqLayout({ children }: LayoutProps<"/">) {
  return (
    <AdminGuard>
      <SmqShell>{children}</SmqShell>
    </AdminGuard>
  );
}
