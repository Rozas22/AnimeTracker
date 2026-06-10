import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_me = """            isMe: true,
            pl: calculatePL(userEps, quizPointsMap[user.id] || 0)"""
replacement_me = """            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            pl: calculatePL(userEps, quizPointsMap[user.id] || 0)"""
code = code.replace(target_me, replacement_me)

target_friend = """            isMe: false,
                pl: calculatePL(simulatedEps, quizPointsMap[friend.id] || 0)"""
replacement_friend = """            isMe: false,
                level: calculateLevel(friend.statistics?.anime?.episodesWatched || 0).computedLevel,
                pl: calculatePL(simulatedEps, quizPointsMap[friend.id] || 0)"""
code = code.replace(target_friend, replacement_friend)

# Ensure calculateLevel is imported
if "calculateLevel" not in code.split('\n')[3]:
    code = code.replace("import { calculatePL, getLeagueInfo } from '../leagueUtils';", "import { calculatePL, getLeagueInfo, calculateLevel } from '../leagueUtils';")

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView level added!")