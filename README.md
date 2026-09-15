# Faheem Ahmed Koppal — portfolio preview

A responsive React portfolio inspired by the composition and motion of [Nothin’](https://www.noth.in/), personalized from Faheem’s CV. Includes an animated opening, staggered work gallery, project dialogs, a filterable index, keyboard-accessible navigation, interactive objects, service accordions, experience, education, certifications, email/phone contact, and a downloadable one-page CV.

## Run

```sh
npm install
npm run dev
```

Production build: `npm run build`. Preview the build: `npm run preview`.

## Personalize

Edit `src/content.js` to update the name, role, introduction, services, projects, email, booking URL, and social links. Images are in `public/images/`. The printable CV source is `public/resume.html`; its generated download is `public/faheem-ahmed-koppal-cv.pdf`.

The work descriptions come from Faheem’s supplied CV. Current images and sculptural assets are references from Nothin’, downloaded for this design preview. They are labeled as placeholders and are not represented as Faheem’s project media. Replace them with actual films, project images, and owned/licensed visual assets before public launch. Fonts are DM Sans and IBM Plex Mono, loaded from Google Fonts; these approximate the reference’s typography.

No messages are submitted, and no external site is deployed. Email and telephone links are configured from the supplied CV. Adding `profile.bookingUrl` activates the booking CTA. Optional social links can be configured in the same file.

The site respects reduced-motion preferences and uses native dialogs for keyboard focus management and Escape dismissal.

## Motion

The interaction pass recreates the reference's eased wheel scrolling (Lenis synchronized with GSAP), cursor-driven fluid video reveal, pinned hero transition, masked text entrances, directional project image wipes, cursor-following project labels, changing WORKS letter layout, pinned gallery-screen reveal, spring-based object repulsion, and elastic footer letters.

The fluid mask uses a small incompressible flow simulation rendered through Canvas 2D, so it also works without WebGL. It and its video stop when inactive or off-screen. Motion preferences are observed live; touch scrolling stays native and desktop pinning is disabled on small screens.

`public/images/hero-motion.mp4` is a compressed motion reference from Nothin’, pending Faheem's own footage. The gallery environment is also reference imagery. Replace these before launch.
