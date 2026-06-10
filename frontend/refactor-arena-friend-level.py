import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        // Add friends using their real stats from AniList + points from Supabase
        anilistFriends?.forEach(friend => {
            const realEps = friend.statistics?.anime?.episodesWatched || 0;
            const friendPoints = quizPointsMap[friend.id] || { quiz: 0, anime: 0 };
            const friendAnimePoints = friendPoints.anime > 0 ? friendPoints.anime : (realEps * 10);

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(realEps).computedLevel,
                pl: friendAnimePoints + friendPoints.quiz
            });
        });"""

replacement = """        // Add friends using points from Supabase as Source of Truth
        anilistFriends?.forEach(friend => {
            const realEps = friend.statistics?.anime?.episodesWatched || 0;
            const friendPoints = quizPointsMap[friend.id] || { quiz: 0, anime: 0 };
            const friendAnimePoints = friendPoints.anime > 0 ? friendPoints.anime : (realEps * 10);
            
            // Supabase is the source of truth for episodes (anime_points / 10)
            const friendEpisodes = friendPoints.anime > 0 ? Math.floor(friendPoints.anime / 10) : realEps;

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(friendEpisodes).computedLevel,
                pl: friendAnimePoints + friendPoints.quiz
            });
        });"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView friend level updated to use Supabase source of truth!")