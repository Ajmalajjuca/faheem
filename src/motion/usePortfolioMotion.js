import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function usePortfolioMotion(root) {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        desktop: "(min-width: 992px)",
      },
      ({ conditions }) => {
        if (!conditions.motion) return;
        const cleanups = [];
        const context = gsap.context(() => {
          gsap.from(".hero-wordmark span", {
            yPercent: 115,
            stagger: { each: 0.055, from: "random" },
            duration: 1.3,
            ease: "power4.inOut",
            delay: 0.1,
          });
          gsap.from(".hero-top, .hero-bottom", {
            opacity: 0,
            y: 20,
            duration: 1,
            delay: 0.7,
            clearProps: "transform,opacity",
          });
          gsap.fromTo(
            ".small-logo",
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              scrollTrigger: {
                trigger: ".hero",
                start: "bottom top",
                toggleActions: "play none none reverse",
              },
              duration: 0.25,
            },
          );
          if (conditions.desktop) {
            const hero = gsap.timeline({
              scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "+=70%",
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
              },
            });
            hero
              .to(".hero-scroll-film", { opacity: 1, scale: 1, duration: 1 }, 0)
              .to(
                ".hero-wordmark",
                { yPercent: -25, opacity: 0, duration: 0.65 },
                0,
              )
              .to(
                ".hero-top, .hero-bottom",
                { y: -35, opacity: 0, duration: 0.45 },
                0,
              )
              .to(".hero-fluid", { opacity: 0, duration: 0.2 }, 0);
          } else {
            gsap.to(".hero-wordmark", {
              yPercent: 20,
              opacity: 0,
              ease: "none",
              scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: 1,
              },
            });
          }

          // Masked line entrances preserve the original headings and responsive wraps.
          gsap.utils
            .toArray("h2.reveal, .intro-bottom p, .about-intro p")
            .forEach((el) => {
              const split = SplitText.create(el, {
                type: "lines",
                mask: "lines",
                autoSplit: true,
                linesClass: "motion-line",
                onSplit: (self) =>
                  gsap.from(self.lines, {
                    yPercent: 110,
                    rotate: 1.5,
                    duration: 1.15,
                    stagger: 0.085,
                    ease: "power4.out",
                    scrollTrigger: {
                      trigger: el,
                      start: "top 88%",
                      once: true,
                    },
                  }),
              });
              cleanups.push(() => split.revert());
            });
          gsap.utils
            .toArray(".reveal:not(h2):not(.intro-bottom):not(.about-intro)")
            .forEach((el) =>
              gsap.from(el, {
                y: 55,
                opacity: 0,
                duration: 1.15,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 91%", once: true },
              }),
            );
          const wipes = [
            "inset(100% 0% 0% 0%)",
            "inset(0% 100% 0% 0%)",
            "inset(0% 0% 100% 0%)",
            "inset(0% 0% 0% 100%)",
          ];
          gsap.utils.toArray(".project-grid .project").forEach((card, i) => {
            const image = card.querySelector(".project-image");
            gsap.fromTo(
              image,
              { clipPath: wipes[i % wipes.length] },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1.4,
                ease: "power4.inOut",
                scrollTrigger: { trigger: card, start: "top 91%", once: true },
              },
            );
            gsap.fromTo(
              image.querySelector("img"),
              { yPercent: -5, scale: 1.18 },
              {
                yPercent: 5,
                scale: 1.18,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 2,
                },
              },
            );
            if (conditions.desktop)
              gsap.to(card, {
                y: [-65, 90, -100, 70, -80][i],
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.5,
                },
              });
          });

          const workWord = root.current.querySelector(".works-word");
          const letters = [...workWord.children];
          if (conditions.desktop) {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: ".work-section",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.2,
                invalidateOnRefresh: true,
              },
            });
            letters.forEach((letter, i) => {
              const targetX = () => 40 + i * 20 - letter.offsetLeft;
              timeline
                .to(
                  letter,
                  {
                    x: targetX,
                    y: 0,
                    scale: 0.06,
                    transformOrigin: "0 0",
                    duration: 0.32,
                    ease: "power3.inOut",
                  },
                  i * 0.018,
                )
                .to(
                  letter,
                  { x: 0, y: 0, scale: 1, duration: 0.4, ease: "power3.inOut" },
                  2.65 + i * 0.018,
                );
            });
          } else
            gsap.from(letters, {
              yPercent: 100,
              stagger: 0.07,
              duration: 1,
              ease: "power4.out",
              scrollTrigger: {
                trigger: workWord,
                start: "top 95%",
                once: true,
              },
            });

          if (conditions.desktop) {
            const stage = gsap.timeline({
              scrollTrigger: {
                trigger: ".film-stage",
                start: "top top",
                end: "+=110%",
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
              },
            });
            stage
              .fromTo(
                ".film-stage-room",
                { scale: 1.65 },
                { scale: 1, ease: "none", duration: 1 },
                0,
              )
              .fromTo(
                ".film-stage-screen",
                { width: "100%", height: "100%", top: "0%", left: "0%" },
                {
                  width: "36%",
                  height: "29%",
                  left: "32%",
                  top: "35%",
                  ease: "power2.inOut",
                  duration: 1,
                },
                0,
              );
          }
          gsap.fromTo(
            ".perspective-image",
            { rotate: -8, y: 90 },
            {
              rotate: 5,
              y: -70,
              ease: "none",
              scrollTrigger: {
                trigger: ".perspective",
                start: "top bottom",
                end: "bottom top",
                scrub: 1.8,
              },
            },
          );

          const statement = root.current.querySelector(".statement-line");
          const split = SplitText.create(statement, {
            type: "chars",
            aria: "hidden",
          });
          gsap.to(statement, {
            xPercent: -12,
            ease: "none",
            scrollTrigger: {
              trigger: ".statement",
              start: "top bottom",
              end: "bottom top",
              scrub: 1.5,
            },
          });
          gsap.to(split.chars, {
            y: () => gsap.utils.random(55, 180),
            rotate: () => gsap.utils.random(-25, 25),
            opacity: 0,
            stagger: { amount: 0.4, from: "random" },
            ease: "power2.in",
            scrollTrigger: {
              trigger: ".statement",
              start: "top top",
              end: "center center",
              scrub: 1.8,
            },
          });
          cleanups.push(() => split.revert());

          const footerLetters = root.current.querySelectorAll(
            ".footer-wordmark span",
          );
          gsap.from(footerLetters, {
            yPercent: 120,
            duration: 1.2,
            stagger: { each: 0.045, from: "random" },
            ease: "power4.inOut",
            scrollTrigger: {
              trigger: ".footer-wordmark",
              start: "top 95%",
              once: true,
            },
          });
          footerLetters.forEach((letter) => {
            const hover = () => {
              if (gsap.isTweening(letter)) return;
              gsap
                .timeline()
                .to(letter, {
                  scale: 0.08,
                  duration: 0.35,
                  ease: "power2.inOut",
                })
                .to(letter, {
                  scale: 1,
                  duration: 1.35,
                  ease: "elastic.out(1,.45)",
                });
            };
            letter.addEventListener("pointerenter", hover);
            cleanups.push(() =>
              letter.removeEventListener("pointerenter", hover),
            );
          });
          const videos = [...root.current.querySelectorAll(".motion-video")];
          const observer = new IntersectionObserver(
            (entries) =>
              entries.forEach(({ target, isIntersecting }) => {
                if (isIntersecting) target.play().catch(() => {});
                else target.pause();
              }),
            { threshold: 0.05 },
          );
          videos.forEach((video) => observer.observe(video));
          cleanups.push(() => {
            observer.disconnect();
            videos.forEach((video) => video.pause());
          });
        }, root);
        let disposed = false;
        document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });
        return () => {
          disposed = true;
          context.revert();
          cleanups.reverse().forEach((clean) => clean());
        };
      },
    );
    return () => media.revert();
  }, [root]);
}
