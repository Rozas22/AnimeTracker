# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Spanish-speaking anime fans in general who already keep their list on AniList. They come to KuramaTracker to track what they watch, see their progress grow, and compete with friends and other fans. The product is open to the public and meant to grow beyond any single friend group.

## Product Purpose

KuramaTracker syncs a user's AniList profile and makes watching anime social and rewarding: episodes watched become levels, a monthly league ranks players, and a daily quiz tests what they know. Success means fans come back every day (quiz, airing episodes) and every month (league reset, prizes) instead of only updating their list now and then on AniList.

## Positioning

AniList is the source of truth for lists. KuramaTracker is a competitive layer on top of it that AniList itself doesn't offer, built from four confirmed pillars:

- **Social competition:** a monthly league (Bronce, Plata, Oro, Diamante), rankings, monthly champions and prizes.
- **Gamified progression:** a level calculated from episodes watched, trophies, titles and unlockable profile frames.
- **Daily quiz:** generated questions that score toward the league and reset on local time.
- **Spanish first and installable:** the whole experience is in Spanish, it installs as an app (PWA) and sends push alerts when anime the user is planning to watch starts airing.

## Operating Context

- Mobile and desktop matter equally. The app is installable (standalone, portrait manifest), and desktop use is a first-class case, not an afterthought.
- Sign-in is through AniList OAuth. List data, airing schedules and covers come from AniList's GraphQL API through a server proxy with edge caching (AniList rate-limits with 429 errors).
- Supabase stores the league, quiz, social and notification data, and powers the realtime group view.
- Scheduled jobs (Vercel Hobby plan, 2 cron jobs max) generate the daily quizzes and reset the monthly league.
- Main areas (routes): Mi Perfil `/`, Mi Lista `/lista`, Buscador `/buscador`, El Grupo `/grupo`, Arena & Quiz `/arena`, Estadísticas `/analisis`, Ajustes `/ajustes`.

## Capabilities and Constraints

- The interface language is Spanish (`lang="es"`, `es_ES`). Synopses are translated to Spanish on demand, with the English original as a fallback.
- Terminology to keep: Nivel (Nv.), Liga Mensual, PL (league points), Bronce/Plata/Oro/Diamante, Marcos (Estándar, Bronce, Plata, Oro, Rubí, Diamante, Croma), Trofeos, Quiz Diario, Arena, El Grupo.
- There is a single source of truth for level calculation (`src/lib/league.ts`, re-exported from `src/utils/league.ts`). New UI must not compute levels on its own.
- Migration in progress: a legacy Vite SPA (`src/App.jsx`, `vercel.json` SPA rewrite) is being replaced by a Next.js 14 App Router app (`src/app/`). New work targets the App Router.
- AniList cover images and avatars are third-party content: show them as they are and don't present them as owned assets.
- Undecided: monetization and pricing (none exist), and any public positioning beyond the current SEO metadata.

## Brand Commitments

- Name: **KuramaTracker** (renamed from AnimeTracker). The logo lives at `frontend/public/logo.png`, and the app icons are `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` and `favicon.png`.
- Voice: plain, enthusiastic Spanish aimed at fans ("Rastrea tu anime y compite en la Liga").

## Evidence on Hand

- Real user data comes only from AniList and Supabase at runtime. No testimonials, user counts, press or case studies exist, and none should be invented.
- The monthly prizes and champions shown in the Arena are real records managed through the admin panel. Don't fabricate example winners.

## Product Principles

1. **AniList stays the source of truth.** KuramaTracker adds competition and progression and never forks or contradicts the user's list.
2. **Give a daily reason to come back.** The quiz, airing alerts and the moving league position should feel alive every day.
3. **Make progress feel earned and visible.** Levels, frames and trophies come from real watching and quiz activity, all calculated in one place.
4. **Spanish speakers come first.** Copy, dates and time zones use the user's language and local time.
5. **Equal footing on phone and desktop.** Every core task works well installed on a phone and on a large screen.
