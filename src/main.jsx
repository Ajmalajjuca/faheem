import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  X,
  Plus,
  Minus,
  Check,
  Copy,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  profile,
  projects,
  experience,
  education,
  certifications,
} from "./content";
import "./styles.css";
import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import FluidReveal from "./motion/FluidReveal";
import { useSmoothScroll } from "./motion/useSmoothScroll";
import { usePortfolioMotion } from "./motion/usePortfolioMotion";
import "./motion/motion.css";

gsap.registerPlugin(ScrollTrigger);
const asset = (name) => `/images/${name}.webp`;
const objects = ["foil", "heart", "asterisk", "candy", "pink"];

function Action({ children, onClick, href, light = false, className = "" }) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      className={`pill ${light ? "pill-light" : ""} ${className}`}
      href={href}
      onClick={onClick}
    >
      <span className="pill-label">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      <span className="pill-arrows">
        <ArrowRight size={19} strokeWidth={1.5} />
        <ArrowRight size={19} strokeWidth={1.5} aria-hidden="true" />
      </span>
    </Tag>
  );
}

function Modal({ kind, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const oldOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal modal-${kind}`}
      aria-label={label}
      data-lenis-prevent
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-body">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function ProjectCard({ project, index, onOpen, compact = false }) {
  const cardRef = useRef(null);
  const cursorRef = useRef(null);
  useEffect(() => {
    const card = cardRef.current,
      cursor = cursorRef.current;
    const move = (event) => {
      if (
        event.pointerType === "touch" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const rect = card.getBoundingClientRect();
      gsap.to(cursor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        scale: 1,
        autoAlpha: 1,
        duration: 0.45,
        ease: "power3.out",
        overwrite: true,
      });
      card.classList.add("cursor-active");
    };
    const leave = () => {
      gsap.to(cursor, {
        scale: 0,
        autoAlpha: 0,
        duration: 0.3,
        ease: "power3.in",
        overwrite: true,
      });
      card.classList.remove("cursor-active");
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(cursor);
    };
  }, []);
  return (
    <button
      ref={cardRef}
      className={`project project-${index + 1} ${compact ? "project-compact" : ""}`}
      onClick={() => onOpen(project)}
      aria-label={`View ${project.title} work details`}
    >
      <div className="project-heading">
        <span className="eyebrow">{project.title}</span>
        <span className="project-number">({project.year})</span>
      </div>
      <h3>{project.description}</h3>
      <div className="project-image" style={{ background: project.color }}>
        <img
          src={project.image}
          alt="Placeholder visual by Nothin’; project media coming soon"
          loading="lazy"
          width="1200"
          height="1000"
        />
        <span className="reference-label">Placeholder image / Nothin’</span>
      </div>
      <span className="project-explore" ref={cursorRef} aria-hidden="true">
        Explore <ArrowRight size={18} />
      </span>
      <div className="project-caption">
        <span>{project.category}</span>
        <ArrowUpRight size={15} />
      </div>
    </button>
  );
}

function ObjectPlayground() {
  const area = useRef(null);
  const [scattered, setScattered] = useState(false);
  function move(e) {
    if (
      e.pointerType === "touch" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const bounds = area.current.getBoundingClientRect();
    area.current
      .querySelectorAll(".floating-object, .loose-letter")
      .forEach((object) => {
        const x = bounds.left + object.offsetLeft + object.offsetWidth / 2;
        const y = bounds.top + object.offsetTop + object.offsetHeight / 2;
        const dx = x - e.clientX,
          dy = y - e.clientY,
          distance = Math.hypot(dx, dy);
        const radius = innerWidth < 600 ? 180 : 420;
        const force = Math.pow(Math.max(0, 1 - distance / radius), 1.6);
        const push = (innerWidth < 600 ? 85 : 240) * force;
        gsap.to(object, {
          x: (dx / Math.max(1, distance)) * push,
          y: (dy / Math.max(1, distance)) * push,
          rotation: ((force * dx) / radius) * 40,
          scale: 1 + force * 0.14,
          duration: force ? 0.5 : 1.25,
          ease: force ? "power3.out" : "elastic.out(1,.4)",
          overwrite: true,
        });
      });
  }
  function reset() {
    gsap.to(area.current.querySelectorAll(".floating-object, .loose-letter"), {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 1.4,
      ease: "elastic.out(1,.4)",
      overwrite: true,
    });
  }
  useEffect(
    () => () =>
      gsap.killTweensOf(
        area.current?.querySelectorAll(".floating-object, .loose-letter") || [],
      ),
    [],
  );
  return (
    <div
      ref={area}
      className={`object-playground ${scattered ? "scattered" : ""}`}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {objects.map((name, i) => (
        <button
          key={name}
          className={`floating-object object-${name}`}
          onClick={() => setScattered((s) => !s)}
          aria-label={`${scattered ? "Gather" : "Scatter"} floating objects`}
        >
          <img
            src={asset(name)}
            alt=""
            loading="lazy"
            style={{ "--delay": `${i * -0.8}s` }}
          />
        </button>
      ))}
      {"FAHEEM".split("").map((letter, i) => (
        <span
          aria-hidden="true"
          className={`loose-letter loose-letter-${i}`}
          key={i}
        >
          {letter}
        </span>
      ))}
      <span className="play-hint eyebrow">
        A little room to play. <Plus size={12} />
      </span>
    </div>
  );
}

function App() {
  const root = useRef(null);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("All");
  const [copied, setCopied] = useState(false);
  const [openService, setOpenService] = useState(null);
  const [time, setTime] = useState("");
  const smooth = useSmoothScroll(root, !!modal);
  usePortfolioMotion(root);
  const close = () => {
    setModal(null);
    setCopied(false);
  };
  const contact = () =>
    profile.bookingUrl
      ? window.open(profile.bookingUrl, "_blank", "noopener,noreferrer")
      : setModal({ kind: "contact" });
  const openProject = (project) => setModal({ kind: "project", project });
  const navigate = (id) => {
    close();
    requestAnimationFrame(() => {
      if (smooth.current) {
        smooth.current.start();
        smooth.current.scrollTo(id, { offset: -75 });
      } else
        document.querySelector(id)?.scrollIntoView({ behavior: "instant" });
    });
  };

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(new Date()),
      );
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 350);
    return () => clearTimeout(timer);
  }, [openService]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div ref={root}>
      <a href="#work" className="skip-link">
        Skip to selected work
      </a>
      <header className="site-header">
        <a
          className="small-logo"
          href="#top"
          aria-label={`${profile.name}, back to top`}
        >
          F’
        </a>
        <div className="header-navigation">
          <nav className="hover-navigation" aria-label="Quick navigation">
            <a href="#work">Works</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <button
            className="menu-trigger"
            onClick={() => setModal({ kind: "menu" })}
            aria-label="Open navigation"
            aria-haspopup="dialog"
          >
            <span>Menu</span>
            <span className="menu-grid" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="top" aria-label="Introduction">
          <div className="hero-scroll-film">
            <video
              className="motion-video"
              src="/images/hero-motion.mp4"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
            <span className="reference-label">Motion reference / Nothin’</span>
          </div>
          <FluidReveal src="/images/hero-motion.mp4" />
          <div className="hero-top">
            <div>
              <p>
                {profile.intro[0]}
                <br />
                {profile.intro[1]}
              </p>
              <Action onClick={contact}>Let’s talk</Action>
            </div>
          </div>
          <h1 className="hero-wordmark" aria-label={profile.name}>
            {`${profile.name.toUpperCase()}`.split("").map((letter, i) => (
              <span key={i} aria-hidden="true">
                {letter}
              </span>
            ))}
          </h1>
          <div className="hero-bottom">
            <p>
              {profile.role}
              <br />
              <span>{profile.location}</span>
            </p>
            <a className="scroll-cue eyebrow" href="#intro">
              Scroll to explore <span>↓</span>
            </a>
            <div className="hero-social">
              <a href="/faheem-ahmed-koppal-cv.pdf" download>
                Résumé ↗
              </a>
              <span>/</span>
              <a href={`mailto:${profile.email}`}>Email ↗</a>
              <span className="language">EN</span>
            </div>
          </div>
        </section>

        <section className="intro section-pad" id="intro">
          <h2 className="reveal">
            Technology makes it possible.
            <br />
            <span>Perspective makes it matter.</span>
          </h2>
          <div className="intro-bottom reveal">
            <span className="section-label">( A different perspective )</span>
            <p>
              A good film starts with understanding people. I bring a marketing
              mindset to AI filmmaking—connecting brand strategy, consumer
              insights, and cinematic imagination.
            </p>
            <span className="intro-asterisk" aria-hidden="true">
              ✳
            </span>
          </div>
        </section>

        <section className="work-section section-pad" id="work">
          <h2 className="works-word" aria-label="Works">
            {"WORKS".split("").map((letter, i) => (
              <span key={i} aria-hidden="true">
                {letter}
              </span>
            ))}
          </h2>
          <div className="works-intro">
            <div className="works-subheading">
              <p>
                From insight to image.
                <br />A closer look at my practice.
              </p>
              <span className="eyebrow">
                Experience & explorations / 01—05
                <br />
                <span className="muted">Project media coming soon</span>
              </span>
            </div>
          </div>
          <div className="project-grid">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                onOpen={openProject}
              />
            ))}
          </div>
          <div className="all-work-row">
            <button
              className="text-link"
              onClick={() => {
                setFilter("All");
                setModal({ kind: "work" });
              }}
            >
              View all work <ArrowUpRight size={28} />
              <sup>(05)</sup>
            </button>
            <span className="eyebrow">A few different perspectives.</span>
          </div>
        </section>

        <section className="film-stage" aria-label="Cinematic motion study">
          <img
            className="film-stage-room"
            src="/images/studio-gallery.webp"
            alt="Gallery environment — reference by Nothin’"
            loading="lazy"
          />
          <div className="film-stage-screen">
            <video
              className="motion-video"
              src="/images/hero-motion.mp4"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          </div>
          <div className="film-stage-caption eyebrow">
            <span>( A cinematic perspective )</span>
            <span>Motion reference / Nothin’</span>
          </div>
        </section>

        <section className="about section-pad" id="about">
          <div className="about-intro reveal">
            <span className="section-label">
              ( The person behind the work )
            </span>
            <p>{profile.about}</p>
          </div>
          <div className="perspective">
            <img
              className="perspective-image"
              src={asset("sculpture")}
              alt="Experimental sculptural visual — reference by Nothin’"
              loading="lazy"
            />
            <h2 className="reveal">
              A little curious.
              <br />A little unexpected.
              <br />
              <span>Entirely intentional.</span>
            </h2>
            <span className="perspective-note eyebrow">
              Different inputs.
              <br />
              New possibilities.
            </span>
          </div>
          <div className="services" id="services">
            <h2 className="reveal">
              Story first.
              <br />
              New possibilities.
            </h2>
            <div className="services-grid reveal">
              <span>What I bring:</span>
              <div className="service-list">
                {profile.services.map((service, i) => (
                  <div className="service" key={service}>
                    <button
                      aria-expanded={openService === i}
                      aria-controls={`service-${i}`}
                      onClick={() =>
                        setOpenService(openService === i ? null : i)
                      }
                    >
                      <span>{service}</span>
                      {openService === i ? (
                        <Minus size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                    </button>
                    <div
                      className={`service-detail ${openService === i ? "is-open" : ""}`}
                      id={`service-${i}`}
                    >
                      <p>{profile.serviceDetails[i]}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Where a marketing mind
                <br />
                meets a cinematic eye.
              </p>
            </div>
          </div>
          <ObjectPlayground />
          <div className="career-section">
            <div className="career-heading reveal">
              <span className="section-label">( Learning by making )</span>
              <h2>A little background.</h2>
              <a
                className="inline-link"
                href="/faheem-ahmed-koppal-cv.pdf"
                download
              >
                Download CV <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="experience-list">
              {experience.map((item) => (
                <article className="experience-row reveal" key={item.company}>
                  <span className="eyebrow">{item.date}</span>
                  <div>
                    <h3>{item.company}</h3>
                    <span className="experience-role">{item.role}</span>
                  </div>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
            <div className="education-grid reveal">
              <span className="section-label">( Education )</span>
              <div>
                {education.map((item) => (
                  <div className="education-row" key={item.school}>
                    <div>
                      <h3>{item.course}</h3>
                      <p>{item.school}</p>
                    </div>
                    <span className="eyebrow">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tools-row reveal">
              <span className="section-label">( In the toolkit )</span>
              <div>
                {profile.tools.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>
            <details
              className="certifications"
              onToggle={() => ScrollTrigger.refresh()}
            >
              <summary>
                Always learning{" "}
                <span>
                  {certifications.length} certifications <Plus size={18} />
                </span>
              </summary>
              <div className="certification-list">
                {certifications.map(([title, issuer]) => (
                  <div key={title}>
                    <h3>{title}</h3>
                    <p>{issuer}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div className="about-facts reveal">
            <div>
              <span className="eyebrow">The approach</span>
              <p>
                Think clearly.
                <br />
                Make thoughtfully.
                <br />
                Stay curious.
              </p>
            </div>
            <div>
              <span className="eyebrow">The collaboration</span>
              <p>
                Good conversations.
                <br />
                Shared ambition.
                <br />
                Something worth making.
              </p>
            </div>
            <div>
              <span className="eyebrow">The next chapter</span>
              <p>
                Maybe it starts
                <br />
                with your idea.
              </p>
              <button className="inline-link" onClick={contact}>
                Let’s find out <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="statement" aria-label="Creative philosophy">
          <div className="statement-line" aria-hidden="true">
            MAKE IT MEAN SOMETHING. MAKE IT MEAN SOMETHING.
          </div>
          <div className="statement-content">
            <span className="section-label">( Room for something new )</span>
            <h2 className="reveal">
              For people
              <br />
              and brands
              <br />
              ready to go
              <br />a little beyond
              <br />
              <span>the ordinary.</span>
            </h2>
            <img
              src={asset("sphere")}
              alt="Reflective experimental sphere — reference by Nothin’"
              loading="lazy"
            />
          </div>
        </section>

        <footer className="footer section-pad" id="contact">
          <div className="footer-top">
            <span className="section-label">
              ( Your idea. Our starting point. )
            </span>
            <span className="availability">
              <i /> Open to conversations
            </span>
          </div>
          <button className="contact-heading" onClick={contact}>
            Let’s make
            <br />
            something
            <span className="contact-arrow">
              <ArrowUpRight strokeWidth={1} />
            </span>
          </button>
          <div className="contact-actions">
            <Action onClick={contact}>Start a conversation</Action>
            <a className="email-link" href={`mailto:${profile.email}`}>
              {profile.email}
              <ArrowUpRight size={18} />
            </a>
          </div>
          <a
            className="footer-wordmark"
            href="#top"
            aria-label={`${profile.name}, back to top`}
          >
            {`${profile.name.toUpperCase()}’`.split("").map((letter, i) => (
              <span aria-hidden="true" key={i}>
                {letter}
              </span>
            ))}
          </a>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {profile.fullName}
            </span>
            <span className="footer-time">
              {time} UTC · {profile.location}
            </span>
            <a href="#top">
              Back to top <ArrowUp size={14} />
            </a>
          </div>
          <p className="preview-credit">
            Design study inspired by{" "}
            <a href="https://www.noth.in/" target="_blank" rel="noreferrer">
              Nothin’
            </a>
            . Images and motion are visual placeholders by Nothin’, not{" "}
            {profile.name}’s project media.
          </p>
        </footer>
      </main>

      {modal && (
        <Modal
          key={modal.kind}
          kind={modal.kind}
          onClose={close}
          label={
            {
              menu: "Navigation",
              project: modal.project?.title,
              work: "All work",
              contact: "Contact",
              social: "Social links",
            }[modal.kind]
          }
        >
          {modal.kind === "menu" && (
            <>
              <span className="modal-logo">F’</span>
              <nav className="menu-links">
                {[
                  ["Work", "#work", "01"],
                  ["About", "#about", "02"],
                  ["Contact", "#contact", "03"],
                ].map(([label, id, number]) => (
                  <button onClick={() => navigate(id)} key={id}>
                    <span>{label}</span>
                    <sup>{number}</sup>
                    <ArrowUpRight />
                  </button>
                ))}
              </nav>
              <div className="menu-bottom">
                <span>
                  {profile.role}
                  <br />
                  {profile.location}
                </span>
                <button onClick={() => setModal({ kind: "contact" })}>
                  Have something in mind? <ArrowUpRight size={18} />
                </button>
              </div>
            </>
          )}
          {modal.kind === "project" && (
            <>
              <span className="eyebrow">{modal.project.context}</span>
              <h2 className="project-modal-title">{modal.project.title}</h2>
              <p className="project-modal-description">
                {modal.project.description}
              </p>
              <div className="project-story">
                <p>{modal.project.detail}</p>
                <ul>
                  {modal.project.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="project-media-placeholder">
                <img
                  className="project-modal-image"
                  src={modal.project.image}
                  alt="Reference placeholder by Nothin’; original project assets to be added"
                />
                <span className="reference-label">
                  Placeholder image by Nothin’ / Project media coming soon
                </span>
              </div>
              <div className="project-modal-footer">
                <p>
                  Experience described from my CV. This image is a visual
                  placeholder by Nothin’; my own film or project material will
                  be added here.
                </p>
                <button
                  className="inline-link"
                  onClick={() => setModal({ kind: "contact" })}
                >
                  Let’s talk about this <ArrowUpRight size={18} />
                </button>
              </div>
              <button
                className="next-project"
                onClick={() => {
                  openProject(
                    projects[
                      (projects.findIndex((p) => p.id === modal.project.id) +
                        1) %
                        projects.length
                    ],
                  );
                  document
                    .querySelector(".modal-project")
                    ?.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                Next perspective <ArrowRight />
              </button>
            </>
          )}
          {modal.kind === "work" && (
            <>
              <span className="eyebrow">
                The index / Experience & explorations
              </span>
              <h2 className="index-heading">
                Works<span>(05)</span>
              </h2>
              <div
                className="filters"
                role="group"
                aria-label="Filter projects"
              >
                {["All", "AI filmmaking", "Research", "Strategy"].map(
                  (item) => (
                    <button
                      key={item}
                      className={filter === item ? "active" : ""}
                      onClick={() => setFilter(item)}
                      aria-pressed={filter === item}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
              <div className="work-index">
                {projects
                  .filter((p) => filter === "All" || p.category === filter)
                  .map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={i}
                      compact
                      onOpen={openProject}
                    />
                  ))}
              </div>
            </>
          )}
          {modal.kind === "contact" && (
            <>
              <span className="eyebrow">
                Every project starts with a hello.
              </span>
              <h2 className="contact-modal-heading">
                Something
                <br />
                in mind?
              </h2>
              <p>
                I’d love to hear about it. For AI film projects, creative
                collaborations, or opportunities, let’s start a conversation.
              </p>
              <a className="contact-email" href={`mailto:${profile.email}`}>
                {profile.email}
                <ArrowUpRight />
              </a>
              <div className="contact-secondary">
                <button className="inline-link copy-button" onClick={copyEmail}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Email copied" : "Copy email address"}
                </button>
                <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>
                  {profile.phone}
                </a>
              </div>
              <span className="contact-modal-signature">{profile.name}’</span>
              <span className="eyebrow">{profile.location}</span>
            </>
          )}
          {modal.kind === "social" && (
            <>
              <span className="eyebrow">Elsewhere on the internet</span>
              <h2 className="contact-modal-heading">
                Let’s
                <br />
                connect.
              </h2>
              {Object.values(profile.social).some(Boolean) ? (
                <div className="social-list">
                  {Object.entries(profile.social)
                    .filter(([, url]) => url)
                    .map(([name, url]) => (
                      <a href={url} key={name} target="_blank" rel="noreferrer">
                        {name}
                        <ArrowUpRight />
                      </a>
                    ))}
                </div>
              ) : (
                <p>
                  Your LinkedIn, Instagram, and Behance links will be added here
                  when you share them.
                </p>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
