import { Suspense } from "react";
import AnimatedLogoLoader from "./components/AnimatedLogoLoader";
import CriticalHero from "./components/CriticalHero";

// Data comes from the CMS content store, so render per request instead of at build time.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense fallback={<AnimatedLogoLoader />}>
        <CriticalHero />
      </Suspense>
    </div>
  );
}
