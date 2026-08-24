# Development Rules for Claude Code

## Stack
- `frontend/` — Vite + React 18 + React Router v6 (SPA, **not** Next.js — there is no App Router and no `"use client"` directive to worry about).
- `backend/` — Node/Express + MongoDB (Mongoose).
- Styling is Tailwind CSS using the custom design tokens in `frontend/tailwind.config.js` (`primary`, `mint`, `surface`, `ink`, `rounded-card`, `shadow-soft`, etc.) — reuse these tokens instead of introducing new ad-hoc colors/shadows.
- i18n is `react-i18next`; all user-facing copy lives under `frontend/src/i18n/locales/{en,hi}/common.json`. Never hardcode UI strings — add matching keys to both locale files.

## Animation Guidelines
- **Do not add `framer-motion`, `motion`, GSAP, or any other animation library.** There is no animation dependency in `frontend/package.json`, and it should stay that way unless a future task explicitly changes this rule.
- For scroll-reveal effects, reuse or follow the pattern in `frontend/src/components/landing/Reveal.jsx` — a small wrapper built on the native `IntersectionObserver` API plus plain Tailwind transition utilities (`transition-all`, `opacity-*`, `translate-y-*`). No new dependency required for this kind of effect.
- Keep motion **restrained**: subtle fade/slide-in on scroll, hover states, button press feedback, and card elevation changes on hover are welcome. Avoid constant/looping motion, heavy parallax, spinning elements, or anything that fights the "calm, trustworthy healthcare product" tone of this app.
- Prefer CSS transitions (`transition`, `duration-*`, `ease-*`) over JS-driven animation for simple state changes (hover, focus, open/close). Only reach for JS-driven animation (still without a new library — `requestAnimationFrame` or the pattern above) when CSS genuinely can't express it.
