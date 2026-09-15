import { useEffect, useRef } from "react";

// A low-resolution, incompressible flow field transports the reveal mask.
// Rendering stays on a separate canvas so the real heading remains accessible.
export default function FluidReveal({ src }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas.parentElement;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};

    function setup() {
      cleanup();
      if (preference.matches) return;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return;
      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d");
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      const fallback = new Image();
      fallback.src = "/images/foil.webp";
      let width,
        height,
        cols,
        rows,
        total,
        u,
        v,
        nextU,
        nextV,
        dye,
        nextDye,
        pressure,
        nextPressure,
        divergence,
        pixels;
      let frame = 0,
        visible = true,
        lastTime = 0,
        lastInput = 0,
        previous = null,
        destroyed = false;
      const pointerQueue = [];

      function resize() {
        const rect = hero.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        const ratio = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        cols = width < 600 ? 120 : 240;
        rows = Math.max(60, Math.round((cols * height) / width));
        total = cols * rows;
        mask.width = cols;
        mask.height = rows;
        [u, v, nextU, nextV, dye, nextDye, pressure, nextPressure, divergence] =
          Array.from({ length: 9 }, () => new Float32Array(total));
        pixels = maskContext.createImageData(cols, rows);
        previous = null;
      }
      const sample = (field, x, y) => {
        x = Math.max(0.5, Math.min(cols - 1.5, x));
        y = Math.max(0.5, Math.min(rows - 1.5, y));
        const ix = Math.floor(x),
          iy = Math.floor(y),
          fx = x - ix,
          fy = y - iy,
          p = iy * cols + ix;
        return (
          field[p] * (1 - fx) * (1 - fy) +
          field[p + 1] * fx * (1 - fy) +
          field[p + cols] * (1 - fx) * fy +
          field[p + cols + 1] * fx * fy
        );
      };
      function splat(point) {
        const { x, y, dx, dy } = point;
        const radius = width < 600 ? 3.2 : 3.8;
        for (
          let yy = Math.max(1, Math.floor(y - radius * 3));
          yy < Math.min(rows - 1, y + radius * 3);
          yy++
        ) {
          for (
            let xx = Math.max(1, Math.floor(x - radius * 3));
            xx < Math.min(cols - 1, x + radius * 3);
            xx++
          ) {
            const dist = ((xx - x) ** 2 + (yy - y) ** 2) / (radius * radius),
              weight = Math.exp(-dist * 1.4),
              p = yy * cols + xx;
            dye[p] = Math.min(2.5, dye[p] + weight * 1.3);
            u[p] += dx * weight * 0.9;
            v[p] += dy * weight * 0.9;
          }
        }
      }
      function step(dt) {
        pointerQueue.splice(0).forEach(splat);
        // Backtrace velocity, then project out divergence to keep a flowing wake.
        for (let y = 1; y < rows - 1; y++)
          for (let x = 1; x < cols - 1; x++) {
            const p = y * cols + x,
              bx = x - u[p] * dt,
              by = y - v[p] * dt;
            nextU[p] = sample(u, bx, by) * Math.pow(0.967, dt);
            nextV[p] = sample(v, bx, by) * Math.pow(0.967, dt);
          }
        [u, nextU] = [nextU, u];
        [v, nextV] = [nextV, v];
        pressure.fill(0);
        for (let y = 1; y < rows - 1; y++)
          for (let x = 1; x < cols - 1; x++) {
            const p = y * cols + x;
            divergence[p] =
              -0.5 * (u[p + 1] - u[p - 1] + v[p + cols] - v[p - cols]);
          }
        for (let k = 0; k < 10; k++) {
          for (let y = 1; y < rows - 1; y++)
            for (let x = 1; x < cols - 1; x++) {
              const p = y * cols + x;
              nextPressure[p] =
                (divergence[p] +
                  pressure[p - 1] +
                  pressure[p + 1] +
                  pressure[p - cols] +
                  pressure[p + cols]) *
                0.25;
            }
          [pressure, nextPressure] = [nextPressure, pressure];
        }
        for (let y = 1; y < rows - 1; y++)
          for (let x = 1; x < cols - 1; x++) {
            const p = y * cols + x;
            u[p] -= 0.5 * (pressure[p + 1] - pressure[p - 1]);
            v[p] -= 0.5 * (pressure[p + cols] - pressure[p - cols]);
          }
        const fade = Math.pow(0.982, dt);
        for (let y = 1; y < rows - 1; y++)
          for (let x = 1; x < cols - 1; x++) {
            const p = y * cols + x;
            nextDye[p] = sample(dye, x - u[p] * dt, y - v[p] * dt) * fade;
          }
        [dye, nextDye] = [nextDye, dye];
      }
      function draw() {
        const data = pixels.data;
        for (let p = 0; p < total; p++) {
          const edge = Math.max(0, Math.min(1, (dye[p] - 0.12) / 0.045));
          data[p * 4 + 3] = Math.round(edge * edge * (3 - 2 * edge) * 255);
        }
        maskContext.putImageData(pixels, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "source-over";
        if (video.readyState >= 2) {
          const scale = Math.max(
            canvas.width / video.videoWidth,
            canvas.height / video.videoHeight,
          );
          context.drawImage(
            video,
            (canvas.width - video.videoWidth * scale) / 2,
            (canvas.height - video.videoHeight * scale) / 2,
            video.videoWidth * scale,
            video.videoHeight * scale,
          );
        } else {
          context.fillStyle = "#080808";
          context.fillRect(0, 0, canvas.width, canvas.height);
          if (fallback.complete && fallback.naturalWidth) {
            const size = canvas.width * 0.65;
            context.drawImage(
              fallback,
              (canvas.width - size) / 2,
              (canvas.height - size) / 2,
              size,
              size,
            );
          }
        }
        context.globalCompositeOperation = "destination-in";
        context.drawImage(mask, 0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "source-over";
      }
      function animate(time) {
        frame = 0;
        if (destroyed || !visible || document.hidden) return;
        if (time - lastInput > 6500) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          video.pause();
          return;
        }
        step(Math.min(1.8, (time - lastTime) / 16.667 || 1));
        lastTime = time;
        draw();
        frame = requestAnimationFrame(animate);
      }
      function move(event) {
        if (
          !visible ||
          event.target.closest("a,button") ||
          preference.matches
        ) {
          previous = null;
          return;
        }
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / width) * cols,
          y = ((event.clientY - rect.top) / height) * rows;
        if (!previous) previous = { x, y };
        const dx = x - previous.x,
          dy = y - previous.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.15) return;
        const steps = Math.min(16, Math.max(1, Math.ceil(distance / 2)));
        for (let i = 1; i <= steps; i++)
          pointerQueue.push({
            x: previous.x + (dx * i) / steps,
            y: previous.y + (dy * i) / steps,
            dx: Math.max(-12, Math.min(12, dx)),
            dy: Math.max(-12, Math.min(12, dy)),
          });
        previous = { x, y };
        lastInput = performance.now();
        if (video.paused) video.play().catch(() => {});
        if (!frame) {
          lastTime = performance.now();
          frame = requestAnimationFrame(animate);
        }
      }
      function leave() {
        previous = null;
      }
      function pause() {
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
          video.pause();
        }
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (!visible) {
            cancelAnimationFrame(frame);
            frame = 0;
            video.pause();
            dye.fill(0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            previous = null;
          }
        },
        { threshold: 0.05 },
      );
      const resizeObserver = new ResizeObserver(resize);
      resize();
      resizeObserver.observe(hero);
      observer.observe(hero);
      hero.addEventListener("pointermove", move, { passive: true });
      hero.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", pause);
      cleanup = () => {
        destroyed = true;
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        observer.disconnect();
        hero.removeEventListener("pointermove", move);
        hero.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", pause);
        video.pause();
        video.removeAttribute("src");
        video.load();
        context.clearRect(0, 0, canvas.width, canvas.height);
      };
    }
    setup();
    preference.addEventListener("change", setup);
    return () => {
      cleanup();
      preference.removeEventListener("change", setup);
    };
  }, [src]);
  return <canvas className="hero-fluid" ref={canvasRef} aria-hidden="true" />;
}
