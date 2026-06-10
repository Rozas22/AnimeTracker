import sys

with open('src/leagueUtils.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = """export const calculateLevel = (totalEpisodes) => {
  let computedLevel = 1;
  let episodiosRestantes = totalEpisodes || 0;"""

replacement = """export const calculateLevel = (totalEpisodes) => {
  if (totalEpisodes === undefined || totalEpisodes === null) {
    return { isPrivate: true, computedLevel: null, userTitle: 'Sin clasificar', episodiosRestantes: 0, episodiosParaSiguienteNivel: 1, progresoPorcentaje: 0 };
  }

  let computedLevel = 1;
  let episodiosRestantes = totalEpisodes || 0;"""

if target in code:
    code = code.replace(target, replacement)

with open('src/leagueUtils.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("leagueUtils updated for private stats!")