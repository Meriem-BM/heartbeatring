import { Suspense } from "react";

import { RingBrowser } from "@/components/ring-browser/ring-browser";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">
          Loading rings...
        </div>
      }
    >
      <RingBrowser />
    </Suspense>
  );
}
