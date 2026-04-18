import { Suspense, lazy } from "react";

const BulletJournal = lazy(async () => {
  const m = await import("../../../bujo/src/app/components/BulletJournal");
  return { default: m.BulletJournal };
});

export function Journal() {
  return (
    <div className="min-h-full">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
            Loading journal...
          </div>
        }
      >
        <BulletJournal />
      </Suspense>
    </div>
  );
}
