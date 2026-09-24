"use client";

import * as React from "react";

/** Resolve reduced-motion preference (client-side, callable in lazy init). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * PageBackground
 * --------------
 * A fixed, full-viewport background image that stays put while the page
 * scrolls over it — so the hero image remains visible throughout the whole
 * page instead of being stuck to the hero section.
 *
 * A gentle zoom is applied as you scroll for a subtle parallax feel.
 * Honors `prefers-reduced-motion` (no zoom, static image).
 */
export function PageBackground({ imageSrc }: { imageSrc: string }) {
  const [progress, setProgress] = React.useState(0);
  const [reduced] = React.useState(prefersReducedMotion);

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress(p);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const zoom = 1 + progress * 0.1;

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageSrc})`,
          transform: reduced ? "none" : `scale(${zoom})`,
          transition: reduced ? "none" : "transform 0.2s linear",
          willChange: "transform",
        }}
      />
      {/* Light wash keeps content readable while the image stays visible */}
      <div className="absolute inset-0 bg-background/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
    </div>
  );
}