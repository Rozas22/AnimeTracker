import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Make the main container responsive
target_container = """<div className="tab-content fade-in" style={{ padding: '0 1rem' }}>"""
replacement_container = """<div className="tab-content fade-in arena-container">"""
code = code.replace(target_container, replacement_container)

# Make the tabs wrap
target_tabs = """<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0 1rem 0' }}>"""
replacement_tabs = """<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '2rem 0 1rem 0', width: '100%', boxSizing: 'border-box' }}>"""
code = code.replace(target_tabs, replacement_tabs)

# Truncate player name and give score container a class
target_info = """                    <div className="ranking-info">
                        <div className="ranking-name">
                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>TÚ</span>}
                            {activeLeague === 'monthly' && player.streak > 0 && (
                                <span style={{ fontSize: '0.8rem', color: '#FF9800', marginLeft: '6px', fontWeight: 'bold' }}>
                                    🔥 Racha: {player.streak}
                                </span>
                            )}
                            {player.isPrivate ? (
                                <span className="league-badge" style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}>🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>"""

replacement_info = """                    <div className="ranking-info">
                        <div className="ranking-name">
                            <span className="truncate-text">{player.name}</span>
                            {player.isMe && <span className="badge-me">TÚ</span>}
                            {activeLeague === 'monthly' && player.streak > 0 && (
                                <span className="badge-streak">🔥 Racha: {player.streak}</span>
                            )}
                            {player.isPrivate ? (
                                <span className="league-badge badge-private">🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div className="ranking-score-container">"""

code = code.replace(target_info, replacement_info)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView modified for responsiveness!")