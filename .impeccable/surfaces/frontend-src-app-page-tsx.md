---
version: 1
slug: "frontend-src-app-page-tsx"
primary_target: "frontend/src/app/page.tsx"
related_targets: ["frontend/src/components/layout/NavigationShell.tsx","frontend/src/components/anime/AnimeCard.tsx"]
---

## Scope

Mi Perfil (`/`), the app's home and first surface of the replacement world; the world then extends to every route (Mi Lista, Buscador, El Grupo, Arena & Quiz, Estadísticas, Ajustes). Mode: Operate.

## Audience and job

A Spanish-speaking anime fan opens the app and, within seconds, wants their level and league position, their numbers (series, episodes, time, mean score, genres) and what to watch now or what airs this week. Actions: continue a series (+1 episode), play the daily quiz, open a series.

## Constraints

- The level always comes from `src/lib/league.ts` (`resolveUnifiedUserLevel`); the shell uses `useSupabaseUser`.
- AniList data via `getUserAnimeCollectionAction` and `getWeeklyAiringScheduleAction`; covers and banners are third-party.
- The user asked for: more 3D, more statistics on the profile "the moment they log in", a new accent colour (no longer amber).

## Direction contract

THESIS: The profile is a streaming wall of your own life as a fan: rows of posters that lift in 3D, crowned by a billboard with your level and league. It rejects the gamified dashboard's grid of glass bento cards.

OWN-WORLD: Deep night-ink ground (#0c0e14) and solid surfaces (#161922 / #1e222d) with no glass and no coloured borders; the posters and banners are the only rich colour. A single electric-lime accent (#c6f432, dark text on top) only for focus, the user's progress and the primary action. Lexend as the only family, tabular numerals, 10px corners on tiles, deep shadows with offset and blur.

STORY: The fan sees who they are in the league (level, PL, position, next goal), reads their numbers at a glance, continues their series from the first row, and sees what airs this week; they play the quiz with one tap.

FIRST VIEWPORT: Standard side rail (bottom tab bar on mobile). Full-width billboard: background is the banner or cover of the series being watched, blurred and darkened; left: avatar with frame, name, title, Nv. and progress bar to the next level; right: league with PL, position and the "Jugar quiz diario" button. Below: a statistics strip (series, episodes, days, mean score) with top-genre bars and status breakdown, then the "Sigues viendo" row of 2:3 posters at the edge of the fold.

FORM: Streaming wall (dealt challenger `pop-culture-shelf-streaming-title-card-wall`, chosen by the user), with the user's twist: more 3D, a profile rich in statistics, a new accent. seed:6a54b490ba350118. Signature interaction: the poster tilts in 3D towards the pointer with a specular sheen and lifts in Z, the active row rises while the others dim slightly; with reduced motion, only scale.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Exact shades of the extended palette (states, league tiers) to be resolved during the build.
