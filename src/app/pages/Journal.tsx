import { Suspense, lazy } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

const BulletJournal = lazy(async () => {
  const m = await import("../../../bujo/src/app/components/BulletJournal");
  return { default: m.BulletJournal };
});

export function Journal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <Link to="/">
          <Button variant="outline" className="bg-white/90">
            <ChevronLeft className="mr-1 size-4" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
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
