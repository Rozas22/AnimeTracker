import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                      const eps = friend.statistics?.anime?.episodesWatched || 0;
                      const stats = calculateLevel(eps);
                      const highestFrame = getHighestFrame(stats.computedLevel);
                      const isClose = (stats.episodiosParaSiguienteNivel - stats.episodiosRestantes) <= 10;"""

replacement = """                      const eps = friend.statistics?.anime?.episodesWatched;
                      const stats = calculateLevel(eps);
                      const highestFrame = stats.isPrivate ? 'none' : getHighestFrame(stats.computedLevel);
                      const isClose = !stats.isPrivate && (stats.episodiosParaSiguienteNivel - stats.episodiosRestantes) <= 10;"""

code = code.replace(target, replacement)

target2 = """                          <div className="level-badge" style={{ marginTop: '0.5rem', marginBottom: '0.5rem', transform: 'scale(0.85)' }}>
                            <Star size={12} style={{ color: 'var(--accent)' }} />
                            <span>Nv {stats.computedLevel}</span>
                          </div>"""

replacement2 = """                          <div className="level-badge" style={{ marginTop: '0.5rem', marginBottom: '0.5rem', transform: 'scale(0.85)', background: stats.isPrivate ? 'rgba(150,150,150,0.1)' : undefined, color: stats.isPrivate ? '#888' : undefined }}>
                            {!stats.isPrivate && <Star size={12} style={{ color: 'var(--accent)' }} />}
                            <span>{stats.isPrivate ? '🔒 Privado' : `Nv ${stats.computedLevel}`}</span>
                          </div>"""

code = code.replace(target2, replacement2)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Group tab updated for private stats!")