export const calculatePL = (episodes = 0, quizPoints = 0) => {
  // 10 puntos por cada episodio visto
  return Math.floor(episodes * 10) + (quizPoints || 0);
};

export const getLeagueInfo = (pl) => {
  if (pl >= 60000) return { name: 'Diamante', class: 'league-diamond', icon: '💎' };
  if (pl >= 30000) return { name: 'Oro', class: 'league-gold', icon: '🏆' };
  if (pl >= 10000) return { name: 'Plata', class: 'league-silver', icon: '🥈' };
  return { name: 'Bronce', class: 'league-bronze', icon: '🥉' };
};

export const getNextLeagueThreshold = (pl) => {
  if (pl < 10000) return 10000;
  if (pl < 30000) return 30000;
  if (pl < 60000) return 60000;
  return null; // Max league
};