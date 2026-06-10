import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """            // Supabase is the source of truth for episodes (anime_points / 10)
            const friendEpisodes = friendPoints.anime > 0 ? Math.floor(friendPoints.anime / 10) : realEps;

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(friendEpisodes).computedLevel,
                pl: friendAnimePoints + friendPoints.quiz
            });"""

replacement1 = """            // Supabase is the source of truth for episodes (anime_points / 10)
            const friendEpisodes = friendPoints.anime > 0 ? Math.floor(friendPoints.anime / 10) : (friend.statistics?.anime?.episodesWatched);
            
            const stats = calculateLevel(friendEpisodes);

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: stats.computedLevel,
                isPrivate: stats.isPrivate,
                pl: friendAnimePoints + friendPoints.quiz
            });"""

code = code.replace(target1, replacement1)

target2 = """                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>TÚ</span>}
                            <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                        </div>
                    </div>"""

replacement2 = """                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>TÚ</span>}
                            {player.isPrivate ? (
                                <span className="league-badge" style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}>🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>"""

code = code.replace(target2, replacement2)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView updated for private stats!")