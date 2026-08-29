import { Suspense } from "react";
import { ActionsPanel } from "@/components/actions/actions-panel";
import { LoadingState } from "@/components/ui";

export default function ActionsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ActionsPanel />
    </Suspense>
  );
}
