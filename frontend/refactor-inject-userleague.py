import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """  const renderContent = () => {
    switch (activeTab) {"""
replacement = """  const renderContent = () => {
    const userLeague = getLeagueInfo(calculatePL(userData?.statistics?.anime?.episodesWatched || 0, quizPoints || 0));
    switch (activeTab) {"""

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("userLeague injected!")