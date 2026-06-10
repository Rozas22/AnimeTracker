import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """  const totalEps = user.statistics?.anime?.episodesWatched || 0;
  const stats = calculateLevel(totalEps);"""

replacement1 = """  const totalEps = user.statistics?.anime?.episodesWatched;
  const stats = calculateLevel(totalEps);"""

code = code.replace(target1, replacement1)

target2 = """              <div className="stat-value" style={{ color: 'var(--accent)', textShadow: '0 0 10px rgba(var(--accent-rgb), 0.5)' }}>
                Nivel {stats.computedLevel} <span style={{ fontSize: '1rem', color: '#888' }}>({stats.userTitle})</span>
              </div>"""

replacement2 = """              <div className="stat-value" style={{ color: 'var(--accent)', textShadow: '0 0 10px rgba(var(--accent-rgb), 0.5)' }}>
                {stats.isPrivate ? 'Privado 🔒' : `Nivel ${stats.computedLevel}`} <span style={{ fontSize: '1rem', color: '#888' }}>({stats.userTitle})</span>
              </div>"""

code = code.replace(target2, replacement2)

target3 = """              <div className="stat-value">{totalEps}</div>"""

replacement3 = """              <div className="stat-value">{stats.isPrivate ? '?' : totalEps}</div>"""

code = code.replace(target3, replacement3)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ProfileHeader updated for private stats!")