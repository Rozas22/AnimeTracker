import sys
import re

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_fetch = """        let quizPointsMap = {};
        
        try {
            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points, anime_points')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = {
                      quiz: row.quiz_points || 0,
                      anime: row.anime_points || 0
                    };
                });"""

replacement_fetch = """        let quizPointsMap = {};
        
        try {
            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points, anime_points, monthly_quiz_points, current_streak')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = {
                      quiz: row.quiz_points || 0,
                      anime: row.anime_points || 0,
                      monthly: row.monthly_quiz_points || 0,
                      streak: row.current_streak || 0
                    };
                });"""

code = code.replace(target_fetch, replacement_fetch)

target_user_add = """        players.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar?.large || user.avatar,
            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            pl: userAnimePoints + userPoints.quiz
        });"""

replacement_user_add = """        players.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar?.large || user.avatar,
            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            animePoints: userAnimePoints,
            pl: userAnimePoints + userPoints.quiz,
            monthlyPl: userPoints.monthly,
            streak: userPoints.streak
        });"""

code = code.replace(target_user_add, replacement_user_add)

target_friend_add = """            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                isPrivate: stats.isPrivate,
                level: stats.computedLevel,
                pl: friendAnimePoints + friendPoints.quiz
            });"""

replacement_friend_add = """            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                isPrivate: stats.isPrivate,
                level: stats.computedLevel,
                animePoints: friendAnimePoints,
                pl: friendAnimePoints + friendPoints.quiz,
                monthlyPl: friendPoints.monthly,
                streak: friendPoints.streak
            });"""

code = code.replace(target_friend_add, replacement_friend_add)

target_sort = """        // Sort descending
        players.sort((a, b) => b.pl - a.pl);
        setLeaderboard(players);"""

replacement_sort = """        // We sort dynamically in the render depending on activeLeague
        setLeaderboard(players);"""

code = code.replace(target_sort, replacement_sort)


target_ui_header = """        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           🎲 Jugar Quiz Diario (+PL)
        </button>
      </div>"""

replacement_ui_header = """        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           🎲 Jugar Quiz Diario (+PL)
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0 1rem 0' }}>
        <button 
          onClick={() => setActiveLeague('global')}
          style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '20px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold',
              background: activeLeague === 'global' ? 'var(--color-anilist-blue)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              transition: '0.3s'
          }}>
          🌍 Liga Global
        </button>
        <button 
          onClick={() => setActiveLeague('monthly')}
          style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '20px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold',
              background: activeLeague === 'monthly' ? '#FF9800' : 'rgba(255,255,255,0.1)',
              color: 'white',
              transition: '0.3s'
          }}>
          📚 Conocimiento (Mensual)
        </button>
      </div>"""

code = code.replace(target_ui_header, replacement_ui_header)

target_ranking = """      <div className="ranking-list">

        {leaderboard.map((player, index) => {
            const league = getLeagueInfo(player.pl);
            const rank = index + 1;
            
            // Lógica de zonas (Ascenso Top 3, Descenso Bottom 2)
            let zoneClass = '';
            if (rank <= 3 && leaderboard.length > 3) zoneClass = 'promotion-zone';
            else if (rank > leaderboard.length - 2 && leaderboard.length > 5) zoneClass = 'relegation-zone';"""

replacement_ranking = """      <div className="ranking-list">

        {[...leaderboard]
          .sort((a, b) => activeLeague === 'global' ? b.pl - a.pl : b.monthlyPl - a.monthlyPl)
          .map((player, index) => {
            const league = activeLeague === 'global' ? getLeagueInfo(player.pl) : getLeagueInfo(player.monthlyPl);
            const scoreToDisplay = activeLeague === 'global' ? player.pl : player.monthlyPl;
            const rank = index + 1;
            
            // Lógica de zonas (Ascenso Top 3, Descenso Bottom 2)
            let zoneClass = '';
            if (rank <= 3 && leaderboard.length > 3) zoneClass = 'promotion-zone';
            else if (rank > leaderboard.length - 2 && leaderboard.length > 5) zoneClass = 'relegation-zone';"""

code = code.replace(target_ranking, replacement_ranking)

target_player_info = """                    <div className="ranking-info">
                        <div className="ranking-name">
                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Tú</span>}
                            {player.isPrivate ? (
                                <span className="league-badge" style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}>🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div className="ranking-score">{player.pl.toLocaleString()} PL</div>"""

replacement_player_info = """                    <div className="ranking-info">
                        <div className="ranking-name">
                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Tú</span>}
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

                    <div style={{ textAlign: 'right' }}>
                        <div className="ranking-score">{scoreToDisplay.toLocaleString()} PL</div>"""

code = code.replace(target_player_info, replacement_player_info)


with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView UI updated for Dual League!")