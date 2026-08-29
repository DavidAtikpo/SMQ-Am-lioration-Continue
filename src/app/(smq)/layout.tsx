import { SmqShell } from "@/components/layout/smq-shell";

export default function SmqLayout({ children }: LayoutProps<"/">) {
  return <SmqShell>{children}</SmqShell>;
}
