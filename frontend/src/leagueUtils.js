export const getEpsForNextLevel = (level) => {
  if (level < 11) return 12 + (level - 1) * 2;
  if (level < 21) return 32 + (level - 11) * 3;
  if (level < 31) return 62 + (level - 21) * 5;
  if (level < 41) return 112 + (level - 31) * 8;
  if (level < 51) return 192 + (level - 41) * 12;
  if (level < 61) return 312 + (level - 51) * 15;
  const growthRate = 1.08;
  return Math.floor(200 * Math.pow(growthRate, level - 61));
};

export const calculateLevel = (totalEpisodes) => {
  let computedLevel = 1;
  let episodiosRestantes = totalEpisodes || 0;
  let episodiosParaSiguienteNivel = getEpsForNextLevel(computedLevel);

  while (episodiosRestantes >= episodiosParaSiguienteNivel) {
    episodiosRestantes -= episodiosParaSiguienteNivel;
    computedLevel++;
    episodiosParaSiguienteNivel = getEpsForNextLevel(computedLevel);
  }
  
  const progresoPorcentaje = (episodiosRestantes / episodiosParaSiguienteNivel) * 100;
  
  let userTitle = 'Novato';
  if (computedLevel >= 61) userTitle = 'Leyenda';
  else if (computedLevel >= 31) userTitle = 'Veterano';
  else if (computedLevel >= 11) userTitle = 'Aprendiz';

  return { computedLevel, userTitle, episodiosRestantes, episodiosParaSiguienteNivel, progresoPorcentaje };
};

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