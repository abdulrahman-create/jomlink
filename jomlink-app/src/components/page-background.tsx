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
 * A pronounced cinematic zoom-in is applied as you scroll down: the image
 * scales from 1.0 → 1.28 and drifts slightly upward, so the page feels like
 * it is moving "into" the image. The zoom is eased (ease-out) so it starts
 * fast near the top and slows as you reach the bottom.
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

  // Cinematic zoom-in: scale 1.0 → 1.28 with a subtle upward drift.
  // Eased (ease-out) so the motion feels natural rather than linear.
  const eased = 1 - Math.pow(1 - progress, 3);
  const zoom = 1 + eased * 0.28;
  const translateY = eased * -3; // % of element height, subtle parallax lift

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageSrc})`,
          transform: reduced
            ? "none"
            : `scale(${zoom}) translateY(${translateY}%)`,
          transition: reduced ? "none" : "transform 0.15s linear",
          willChange: "transform",
        }}
      />
      {/* Light wash keeps content readable while the image stays visible */}
      <div className="absolute inset-0 bg-background/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
    </div>
  );
}