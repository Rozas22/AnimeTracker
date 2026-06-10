import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """<div className="ranking-score">{player.pl.toLocaleString()} PL</div>"""
replacement = """<div className="ranking-score">{scoreToDisplay.toLocaleString()} PL</div>"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView score display updated!")