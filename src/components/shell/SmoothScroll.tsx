"use client";

import { type LenisRef, ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMotionAllowed } from "@/lib/hooks";

/** Pop-up lists, dialogs and comic scroll boxes keep their own native scrolling. */
const keepNative = (node: HTMLElement) => {
  const role = node.getAttribute("role");
  return role === "dialog" || role === "listbox" || node.classList.contains("scroll-comic");
};

// One fixed object: a new one each render would make ReactLenis rebuild the scroller.
const OPTIONS = { autoRaf: false, lerp: 0.09, anchors: true, stopInertiaOnNavigate: true, prevent: keepNative };

/**
 * Smooth, weighty page scrolling. GSAP's ticker drives Lenis so scroll-scrubbed
 * scenes and the scroll position never drift apart. Off when motion is reduced.
 */
export function SmoothScroll() {
  const allowed = useMotionAllowed();
  const ref = useRef<LenisRef>(null);

  useEffect(() => {
    if (!allowed) return;
    const tick = (time: number) => ref.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [allowed]);

  if (!allowed) return null;
  return (
    <ReactLenis root ref={ref} options={OPTIONS}>
      <ScrollSync />
    </ReactLenis>
  );
}

function ScrollSync() {
  const path = usePathname();
  const lenis = useLenis(ScrollTrigger.update);
  // A new page starts at the top, without coasting on the old page's momentum.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [path, lenis]);
  // Dialogs lock the page by hiding body overflow; follow that, so every modal pauses the page.
  useEffect(() => {
    if (!lenis) return;
    const sync = () => (document.body.style.overflow === "hidden" ? lenis.stop() : lenis.start());
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => watch.disconnect();
  }, [lenis]);
  return null;
}
