import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = "const userLeague = userData ? getLeagueInfo(calculatePL(userData.statistics?.anime?.episodesWatched || 0, quizPoints)) : null;"
replacement = "const userLeague = getLeagueInfo(calculatePL(userData?.statistics?.anime?.episodesWatched || 0, quizPoints || 0));"

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("userLeague computation fixed!")