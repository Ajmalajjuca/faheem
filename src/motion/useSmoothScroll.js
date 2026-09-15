import { useLayoutEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

export function useSmoothScroll(root, modalOpen) {
  const scroll = useRef(null);
  useLayoutEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let remove = () => {};
    const setup = () => {
      remove();
      if (preference.matches) return;
      const lenis = new Lenis({
        duration: 1.2,
        lerp: undefined,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -75 },
        prevent: (node) => node.closest?.("dialog"),
      });
      scroll.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      remove = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        scroll.current = null;
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => {
      remove();
      preference.removeEventListener("change", setup);
    };
  }, [root]);
  useLayoutEffect(() => {
    if (modalOpen) scroll.current?.stop();
    else scroll.current?.start();
  }, [modalOpen]);
  return scroll;
}
