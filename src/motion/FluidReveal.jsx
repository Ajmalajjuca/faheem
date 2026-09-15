import { useEffect, useRef } from "react";
import { createGpuFluid } from "./gpuFluid";

// A crisp, full-resolution wake for devices without floating-point WebGL.
function createCanvasWake(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const mask = document.createElement("canvas");
  const ink = mask.getContext("2d");
  let width,
    height,
    padding,
    ratio,
    trails = [];
  return {
    resize(w, h, p) {
      width = w;
      height = h;
      padding = p;
      ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = mask.width = Math.round(w * ratio);
      canvas.height = mask.height = Math.round(h * ratio);
      canvas.dataset.renderer = "canvas2d";
      canvas.dataset.maskResolution = `${canvas.width}x${canvas.height}`;
      trails = [];
    },
    frame(dt, points, video) {
      trails.push(...points.map((p) => ({ ...p, age: 0 })));
      trails = trails.filter((p) => (p.age += dt) < 2.5);
      ink.clearRect(0, 0, mask.width, mask.height);
      ink.fillStyle = "#fff";
      for (const p of trails) {
        ink.beginPath();
        ink.arc(
          p.x * canvas.width,
          (1 - p.y) * canvas.height,
          0.032 * canvas.height * (1 - p.age / 2.5),
          0,
          Math.PI * 2,
        );
        ink.fill();
      }
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#020202";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const w = (width - 2 * padding) * ratio,
        h = (w * 9) / 16;
      if (video.readyState >= 2)
        context.drawImage(
          video,
          padding * ratio,
          (height * ratio - h) / 2,
          w,
          h,
        );
      context.globalCompositeOperation = "destination-in";
      context.drawImage(mask, 0, 0);
    },
    clear() {
      trails = [];
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    destroy() {
      trails = [];
    },
  };
}

export default function FluidReveal() {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current,
      hero = host.parentElement;
    const video = hero.querySelector(".hero-scroll-film video");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    function setup() {
      cleanup();
      if (preference.matches) return;
      let canvas = document.createElement("canvas"),
        engine;
      host.replaceChildren(canvas);
      try {
        engine = createGpuFluid(canvas);
      } catch (error) {
        console.warn("Using canvas reveal fallback:", error.message);
      }
      if (!engine) {
        canvas = document.createElement("canvas");
        host.replaceChildren(canvas);
        engine = createCanvasWake(canvas);
      }
      if (!engine) return;
      let width = 0,
        height = 0,
        frame = 0,
        previous = null,
        lastTime = 0,
        lastInput = 0,
        visible = true;
      const queue = [];
      function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = null;
        queue.length = 0;
        engine.clear();
        canvas.dataset.active = "false";
      }
      function resize() {
        const rect = hero.getBoundingClientRect();
        if (rect.width === width && rect.height === height) return;
        width = rect.width;
        height = rect.height;
        engine.resize(
          width,
          height,
          parseFloat(getComputedStyle(hero).paddingLeft),
        );
        previous = null;
      }
      function tick(now) {
        frame = 0;
        if (!visible || document.hidden || now - lastInput > 7000) {
          stop();
          return;
        }
        const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastTime) / 1000));
        lastTime = now;
        engine.frame(dt, queue.splice(0), video);
        canvas.dataset.active = "true";
        frame = requestAnimationFrame(tick);
      }
      function move(event) {
        if (!visible || document.hidden) return;
        const rect = hero.getBoundingClientRect();
        const p = {
          x: (event.clientX - rect.left) / width,
          y: 1 - (event.clientY - rect.top) / height,
        };
        const old = previous || p,
          dx = p.x - old.x,
          dy = p.y - old.y;
        const count = Math.min(
          8,
          Math.max(1, Math.ceil(Math.hypot(dx * width, dy * height) / 12)),
        );
        for (let i = 1; i <= count; i++)
          queue.push({
            x: old.x + (dx * i) / count,
            y: old.y + (dy * i) / count,
            dx: Math.max(-0.07, Math.min(0.07, dx)) / count,
            dy: Math.max(-0.07, Math.min(0.07, dy)) / count,
          });
        if (queue.length > 24) queue.splice(0, queue.length - 24);
        previous = p;
        lastInput = performance.now();
        if (video.paused) video.play().catch(() => {});
        if (!frame) {
          lastTime = lastInput;
          frame = requestAnimationFrame(tick);
        }
      }
      const leave = () => {
        previous = null;
      };
      const visibility = () => {
        if (document.hidden) stop();
      };
      const lost = (event) => {
        event.preventDefault();
        stop();
      };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) stop();
      });
      const sizing = new ResizeObserver(resize);
      resize();
      sizing.observe(hero);
      observer.observe(hero);
      hero.addEventListener("pointermove", move, { passive: true });
      hero.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", visibility);
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", setup);
      cleanup = () => {
        stop();
        sizing.disconnect();
        observer.disconnect();
        hero.removeEventListener("pointermove", move);
        hero.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", visibility);
        canvas.removeEventListener("webglcontextlost", lost);
        canvas.removeEventListener("webglcontextrestored", setup);
        engine.destroy();
        host.replaceChildren();
      };
    }
    setup();
    preference.addEventListener("change", setup);
    return () => {
      preference.removeEventListener("change", setup);
      cleanup();
    };
  }, []);
  return <div className="hero-fluid" ref={hostRef} aria-hidden="true" />;
}
