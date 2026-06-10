import sys

# 1. Update leagueUtils.js
with open('src/leagueUtils.js', 'r', encoding='utf-8') as f:
    league_code = f.read()

new_league_code = """export const getEpsForNextLevel = (level) => {
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

""" + league_code

with open('src/leagueUtils.js', 'w', encoding='utf-8') as f:
    f.write(new_league_code)

print("leagueUtils.js updated!")