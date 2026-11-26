/**
 * Fragmento GraphQL estándar para Media optimizado para tarjetas y modales.
 */
export const MEDIA_CORE_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  format
  status
  description(asHtml: false)
  season
  seasonYear
  episodes
  duration
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  averageScore
  meanScore
  popularity
  isAdult
  siteUrl
  nextAiringEpisode {
    id
    airingAt
    timeUntilAiring
    episode
  }
  externalLinks {
    id
    url
    site
    type
    language
    color
    icon
    isDisabled
  }
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
`;
